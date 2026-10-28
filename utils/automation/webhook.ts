import { getAutomationRules } from "~storage/automationRules";
import type { AutomationRule } from "~types/automation";

/**
 * 校验剪贴板内容并异步触发 Webhook 自动化
 */
export async function triggerClipboardAutomation(content: string): Promise<void> {
  if (!content) return;

  try {
    const rules = await getAutomationRules();
    const enabledRules = rules.filter((r) => r.enabled && r.webhookUrl && r.pattern);

    for (const rule of enabledRules) {
      try {
        const regex = new RegExp(rule.pattern, "i");
        if (regex.test(content)) {
          console.log(`[Automation] Rule matched: "${rule.name}", sending Webhook to: ${rule.webhookUrl}`);
          executeWebhook(rule, content);
        }
      } catch (err) {
        console.error(`[Automation] Invalid regex pattern in rule "${rule.name}":`, err);
      }
    }
  } catch (err) {
    console.error("[Automation] Error evaluating automation rules:", err);
  }
}

/**
 * 执行 Webhook 请求
 */
async function executeWebhook(rule: AutomationRule, content: string): Promise<void> {
  const payload = {
    event: "clipboard_created",
    timestamp: new Date().toISOString(),
    ruleName: rule.name,
    matchedPattern: rule.pattern,
    content,
  };

  try {
    if (rule.method === "GET") {
      const url = new URL(rule.webhookUrl);
      url.searchParams.append("content", content.slice(0, 500));
      url.searchParams.append("rule", rule.name);
      await fetch(url.toString(), { method: "GET" });
    } else {
      await fetch(rule.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    }
    console.log(`[Automation] Webhook delivered successfully for rule "${rule.name}"`);
  } catch (err) {
    console.error(`[Automation] Failed to deliver Webhook for rule "${rule.name}":`, err);
  }
}
