import { processNextRequest } from "../services/allocationService.js";

let isRunning = false;

export const triggerImmediateAllocation = async () => {
    // Prevent overlapping runs
    if (isRunning) {
        return;
    }

    isRunning = true;

    try {
        let processedAny = false;
        let result;

        // Keep processing while there are eligible waiting/paused requests
        do {
            result = await processNextRequest();
            if (result && result.processed) {
                processedAny = true;
                console.log(`Request ${result.requestCode} allocated successfully`);
            }
        } while (result && result.processed);

        return processedAny;
    } catch (error) {
        console.error("Allocation execution error:", error);
    } finally {
        isRunning = false;
    }
};

export const startAllocationWorker = () => {
    console.log("Allocation worker started");

    // Check immediately when the server starts
    triggerImmediateAllocation();

    // Check for new/paused requests every 5 seconds
    setInterval(() => {
        triggerImmediateAllocation();
    }, 5000);
};

