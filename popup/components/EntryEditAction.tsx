import { Tooltip } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconEdit } from "@tabler/icons-react";
import React from "react";

import type { Entry } from "~types/entry";

import { CommonActionIcon } from "./CommonActionIcon";
import { EditEntryModalContent } from "./modals/EditEntryModalContent";

interface Props {
  entry: Entry;
}

export const EntryEditAction: React.FC<Props> = ({ entry }) => {
  const handleOpenEdit = () => {
    modals.open({
      withCloseButton: false,
      padding: 0,
      children: <EditEntryModalContent entry={entry} />,
    });
  };

  return (
    <Tooltip label="编辑剪贴板内容">
      <div>
        <CommonActionIcon onClick={handleOpenEdit}>
          <IconEdit size="1rem" />
        </CommonActionIcon>
      </div>
    </Tooltip>
  );
};
