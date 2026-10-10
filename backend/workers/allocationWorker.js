import { processNextRequest } from "../services/allocationService.js";

let isRunning = false;

export const startAllocationWorker = () => {
    console.log("Allocation worker started");

    const runAllocation = async () => {
        // Prevent two allocation runs from happening at the same time
        if (isRunning) {
            return;
        }

        isRunning = true;

        try {
            const result = await processNextRequest();

            if (result.processed) {
                console.log(
                    `Request ${result.requestCode} allocated successfully`
                );
            }
        } catch (error) {
            console.error("Background allocation error:", error);
        } finally {
            isRunning = false;
        }
    };

    // Check immediately when the server starts
    runAllocation();

    // Check for new requests every 5 seconds
    setInterval(runAllocation, 5000);
};
