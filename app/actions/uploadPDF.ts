"use server"

import { api } from "@/convex/_generated/api";
import convex from "@/lib/convexClient";
import { currentUser } from "@clerk/nextjs/server"
import { getFileDownloadUrl } from "./getFileDownloadUrl";
import { inngest } from "@/inngest/client";
import { success } from "zod";
import { Events } from "@/inngest/contansts";

// Server action to upload a PDF file to convex storage
const uploadPDF = async(formData: FormData) => {
    const user = await currentUser();

    if(!user) {
        return {success: false, error: "Not authenticated"}
    }

    try {
        //Get the file from the form data
        const file = formData.get("file") as File;

        if(!file) {
            return {success: false, error: "No file provided"}
        }

        //validate file type
        if(
            !file.type.includes("pdf") &&
            !file.name.toLowerCase().endsWith(".pdf")
        ){
            return {success: false, error: "Only PDF files are allowed"}
        }

        //get upload url from convex
        const uploadUrl = await convex.mutation(api.receipts.generatedUploadUrl, {})

        //convert file to arrayBuffer for fetch API
        const arrayBuffer = await file.arrayBuffer();

        //upload the file to convex storage
        const uploadResponse = await fetch(uploadUrl, {
            method: "POST",
            headers: {
                "Content-Type": file.type,
            },
            body: new Uint8Array(arrayBuffer),
        });

        if(!uploadResponse.ok) {
            throw new Error(`Failed to upload file: ${uploadResponse.statusText}`)
        }

        //get storage Id from the response
        const {storageId} = await uploadResponse.json();

        //add receipt to the database
        const receiptId = await convex.mutation(api.receipts.storeReceipt, {
            userId: user.id,
            fileId: storageId,
            fileName: file.name,
            size: file.size,
            mimeType: file.type,
        });

        //generate the file URl
        const fileUrl = await getFileDownloadUrl(storageId);

        //TODO: trigger inngest agent flow...
        await inngest.send({
            name: Events.EXTRACT_DATA_FROM_PDF_AND_SAVE_TO_DATABASE,
            data: {
                url: fileUrl.downloadUrl,
                receiptId,
            }
        });

        return {
            success: true,
            data: {
                receiptId,
                fileName: file.name,
            },
        };

    } catch (error) {
        console.error("Server action upload error:", error);
        return {
            success: false,
            error: 
                error instanceof Error ? error.message : "An unknown error occured"
        }
    }
}

export default uploadPDF