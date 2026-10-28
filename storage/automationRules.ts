import { Storage } from "@plasmohq/storage";

import { defaultAutomationRules, type AutomationRule } from "~types/automation";

const AUTOMATION_RULES_STORAGE_KEY = "automationRules";

const storage = new Storage({
  area: "local",
});

export const getAutomationRules = async (): Promise<AutomationRule[]> => {
  const rules = await storage.get<AutomationRule[]>(AUTOMATION_RULES_STORAGE_KEY);
  return rules && Array.isArray(rules) ? rules : defaultAutomationRules;
};

export const setAutomationRules = async (rules: AutomationRule[]): Promise<void> => {
  await storage.set(AUTOMATION_RULES_STORAGE_KEY, rules);
};

export const watchAutomationRules = (cb: (rules: AutomationRule[]) => void) => {
  return storage.watch({
    [AUTOMATION_RULES_STORAGE_KEY]: (c) => {
      cb((c.newValue as AutomationRule[]) || defaultAutomationRules);
    },
  });
};
