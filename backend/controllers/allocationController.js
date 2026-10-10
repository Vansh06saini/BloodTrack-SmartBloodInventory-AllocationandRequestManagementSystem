import { processNextRequest } from "../services/allocationService.js";

export const processAllocation = async (req, res) => {
    try {
        const result = await processNextRequest();

        res.status(200).json(result);
    } catch (error) {
        console.error("Allocation error:", error);

        res.status(500).json({
            message: "Allocation failed"
        });
    }
};