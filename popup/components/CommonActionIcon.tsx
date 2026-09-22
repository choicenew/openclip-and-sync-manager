import { useAtomValue } from "jotai";
import React, { forwardRef, type PropsWithChildren } from "react";

import { transitioningEntryContentHashAtom } from "~popup/states/atoms";

interface Props {
  disabled?: boolean;
  color?: string;
  backgroundColor?: string;
  hoverColor?: string;
  onClick?: () => void;
}

export const CommonActionIcon = forwardRef<HTMLButtonElement, PropsWithChildren<Props>>(
  ({ disabled, onClick, children }, ref) => {
    const transitioningEntryContentHash = useAtomValue(transitioningEntryContentHashAtom);
    const isDisabled = disabled || transitioningEntryContentHash !== undefined;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className="native-btn native-btn-sm native-btn-subtle"
        style={{ padding: "2px 4px", fontSize: "11px" }}
        onClick={(e) => {
          e.stopPropagation();
          if (isDisabled || onClick === undefined) return;
          onClick();
        }}>
        {children}
      </button>
    );
  },
);
