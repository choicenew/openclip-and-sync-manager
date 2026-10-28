import { z } from "zod";

export const AutomationRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  pattern: z.string(), // 正则表达式字符串
  webhookUrl: z.string(), // 触发的 Webhook HTTP(S) 地址
  method: z.enum(["GET", "POST"]).default("POST"),
  enabled: z.boolean().default(true),
});

export type AutomationRule = z.infer<typeof AutomationRuleSchema>;

export const defaultAutomationRules: AutomationRule[] = [
  {
    id: "auto_rule_1",
    name: "订单号/快递单号检测 Webhook",
    pattern: "(SF|YT|ST|JD|EMS)\\d{10,15}",
    webhookUrl: "",
    method: "POST",
    enabled: false,
  },
];
