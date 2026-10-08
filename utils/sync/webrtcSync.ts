/**
 * utils/sync/webrtcSync.ts
 *
 * 基于 WebRTC (RTCPeerConnection & RTCDataChannel) 的局域网 P2P 毫秒级直连同步服务。
 * 绕过云端中间件，在同一 Wi-Fi 下实现 < 10ms 无感剪贴板推拉同步。
 */

import type { Entry } from "~types/entry";
import { _setEntries, getEntries } from "~utils/storage";

export type P2PStatus = "disconnected" | "connecting" | "connected" | "error";

class WebRTCSyncService {
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private status: P2PStatus = "disconnected";
  private statusListeners: Array<(status: P2PStatus) => void> = [];

  private rtcConfig: RTCConfiguration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  public getStatus(): P2PStatus {
    return this.status;
  }

  public onStatusChange(listener: (status: P2PStatus) => void) {
    this.statusListeners.push(listener);
    listener(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  private setStatus(newStatus: P2PStatus) {
    this.status = newStatus;
    this.statusListeners.forEach((l) => l(newStatus));
  }

  private initPeerConnection() {
    if (this.pc) this.pc.close();
    this.pc = new RTCPeerConnection(this.rtcConfig);

    this.pc.oniceconnectionstatechange = () => {
      if (!this.pc) return;
      if (this.pc.iceConnectionState === "connected") {
        this.setStatus("connected");
      } else if (
        this.pc.iceConnectionState === "disconnected" ||
        this.pc.iceConnectionState === "failed"
      ) {
        this.setStatus("disconnected");
      }
    };

    this.pc.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };
  }

  private setupDataChannel() {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      this.setStatus("connected");
      console.log("[P2P WebRTC] Data channel open.");
    };

    this.dataChannel.onclose = () => {
      this.setStatus("disconnected");
      console.log("[P2P WebRTC] Data channel closed.");
    };

    this.dataChannel.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data) as { type: string; entry: Entry };
        if (payload.type === "CLIPBOARD_ENTRY" && payload.entry) {
          const existing = await getEntries();
          if (!existing.some((e) => e.content === payload.entry.content)) {
            await _setEntries([payload.entry, ...existing]);
            console.log("[P2P WebRTC] Received real-time clipboard entry from peer!");
          }
        }
      } catch (err) {
        console.warn("[P2P WebRTC] Error parsing message:", err);
      }
    };
  }

  /**
   * 主控方：创建 Offer 信令
   */
  public async createOffer(): Promise<string> {
    this.initPeerConnection();
    if (!this.pc) throw new Error("PeerConnection failed");

    this.dataChannel = this.pc.createDataChannel("openclip_p2p");
    this.setupDataChannel();

    this.setStatus("connecting");
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // 等待 ICE Candidates 搜集完成
    await new Promise<void>((resolve) => {
      if (!this.pc) return resolve();
      if (this.pc.iceGatheringState === "complete") {
        resolve();
      } else {
        const check = () => {
          if (this.pc?.iceGatheringState === "complete") {
            this.pc.removeEventListener("icegatheringstatechange", check);
            resolve();
          }
        };
        this.pc.addEventListener("icegatheringstatechange", check);
      }
    });

    return JSON.stringify(this.pc.localDescription);
  }

  /**
   * 接收方：接受 Offer 并创建 Answer 信令
   */
  public async acceptOfferAndCreateAnswer(offerSDPStr: string): Promise<string> {
    this.initPeerConnection();
    if (!this.pc) throw new Error("PeerConnection failed");

    this.setStatus("connecting");
    const offerDesc = JSON.parse(offerSDPStr);
    await this.pc.setRemoteDescription(offerDesc);

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    await new Promise<void>((resolve) => {
      if (!this.pc) return resolve();
      if (this.pc.iceGatheringState === "complete") {
        resolve();
      } else {
        const check = () => {
          if (this.pc?.iceGatheringState === "complete") {
            this.pc.removeEventListener("icegatheringstatechange", check);
            resolve();
          }
        };
        this.pc.addEventListener("icegatheringstatechange", check);
      }
    });

    return JSON.stringify(this.pc.localDescription);
  }

  /**
   * 主控方：设置 Answer 完成握手
   */
  public async acceptAnswer(answerSDPStr: string): Promise<void> {
    if (!this.pc) throw new Error("PeerConnection lost");
    const answerDesc = JSON.parse(answerSDPStr);
    await this.pc.setRemoteDescription(answerDesc);
  }

  /**
   * 通过 WebRTC DataChannel 广播复制条目
   */
  public sendEntry(entry: Entry) {
    if (this.dataChannel && this.dataChannel.readyState === "open") {
      this.dataChannel.send(
        JSON.stringify({
          type: "CLIPBOARD_ENTRY",
          entry,
        }),
      );
    }
  }

  public disconnect() {
    if (this.dataChannel) this.dataChannel.close();
    if (this.pc) this.pc.close();
    this.setStatus("disconnected");
  }
}

export const webrtcSyncService = new WebRTCSyncService();
