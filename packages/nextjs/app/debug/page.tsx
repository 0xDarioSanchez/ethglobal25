import { DebugContracts } from "./_components/DebugContracts";
import type { NextPage } from "next";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Contracts",
  description: "Interaction with deployed contracts",
});

const Debug: NextPage = () => {
  return (
    <>
      <DebugContracts />

    </>
  );
};

export default Debug;
