"use server"

import {api} from "@/convex/_generated/api"
import {Id} from "@/convex/_generated/dataModel"
import convex from "@/lib/convexClient"

//server action to get a download url for a file in convex storage
export async function getFileDownloadUrl(fileId: Id<"_storage"> | string) {
    try {
        //get download url from convex
        const downloadUrl = await convex.query(api.receipts.getReceiptDownloadUrl, {
            fileId: fileId as Id<"_storage">,
        });

        if(!downloadUrl) {
            throw new Error("Could not generate dowload URL")
        }

        return {
            success: true,
            downloadUrl,
        }

    } catch (error) {
        console.error("Error generating download URL:", error)

        return {
            success: false,
            error: 
                error instanceof Error ? error.message : "An unknown error occured",
        }
    }
}