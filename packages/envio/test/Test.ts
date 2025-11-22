import assert from "assert";
import { 
  TestHelpers,
  MockPYUSD_Transfer
} from "generated";
const { MockDb, MockPYUSD } = TestHelpers;

describe("MockPYUSD Transfer event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Creating mock for MockPYUSD Transfer event
  const event = MockPYUSD.Transfer.createMockEvent({
    from: "0x1234567890123456789012345678901234567890",
    to: "0x0987654321098765432109876543210987654321",
    value: 1000n
  });

  it("MockPYUSD_Transfer is created correctly", async () => {
    // Processing the event
    const mockDbUpdated = await MockPYUSD.Transfer.processEvent({
      event,
      mockDb,
    });

    // Getting the actual entity from the mock database
    let actualTransfer = mockDbUpdated.entities.MockPYUSD_Transfer.get(
      `${event.chainId}_${event.block.number}_${event.logIndex}`
    );

    // Creating the expected entity
    const expectedTransfer: MockPYUSD_Transfer = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      from: event.params.from,
      to: event.params.to,
      value: event.params.value,
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash,
      timestamp: BigInt(event.block.timestamp),
    };
    
    // Asserting that the entity in the mock database is the same as the expected entity
    assert.deepEqual(actualTransfer, expectedTransfer, "Actual Transfer should be the same as the expected Transfer");
  });
});