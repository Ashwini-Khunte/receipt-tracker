import {v} from "convex/values"
import {mutation, query} from "./_generated/server"

//function to generate a convex upload URl for the client
export const generatedUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        //generate a url that the client can use to upload a file
        return await ctx.storage.generateUploadUrl()
    },
})

//store a receipt file and add it to the database
export const storeReceipt = mutation({
    args: {
        userId: v.string(),
        fileId: v.id("_storage"),
        fileName: v.string(),
        size: v.number(),
        mimeType: v.string(),
    },
    handler: async (convexToJson, args) => {
        //save the receipt to the database
        const receiptId = await convexToJson.db.insert("receipts", {
            userId: args.userId,
            fileName: args.fileName,
            fileId: args.fileId,
            uploadedAt: Date.now(),
            size: args.size,
            mimeType: args.mimeType,
            status: "pending",
            //initialize extracted data fields as null
            merchantName: undefined,
            merchantAddress: undefined,
            merchantContact: undefined,
            transactionDate: undefined,
            transactionAmount: undefined,
            currency: undefined,
            items: []
        });

        return receiptId;
    }
})

//function to get all receipts
export const getReceipts = query({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        //only return receipts ofr the authenticated user
        return await ctx.db
            .query("receipts")
            .filter((q) => q.eq(q.field("userId"), args.userId))
            .order("desc")
            .collect();
    }
})

//function to get a single receipt by ID
export const getreceiptById = query({
    args: {
        id: v.id("receipts"),
    },
    handler: async (ctx, args) => {
        //get the receipt
        const receipt = await ctx.db.get(args.id);

        //verify user has access to this receipt
        if(receipt) {
            const identity = await ctx.auth.getUserIdentity();
            if(!identity) {
                throw new Error("Not authenticated");
            }

            const userId = identity.subject;
            if(receipt.userId !== userId) {
                throw new Error("Not authorized to access this receipt")
            }
        };

        return receipt;
    }
})

//genearte a url to doenload a receipt file
export const getReceiptDownloadUrl = query({
    args: {
        fileId: v.id("_storage"),
    },
    handler: async (ctx, args) => {
        //get a temporary url that can be used to download the file
        return await ctx.storage.getUrl(args.fileId)
    }
})

//update the status of a receipt
export const updattReceiptStatus = mutation({
    args: {
        id: v.id("receipts"),
        status: v.string()
    },
    handler: async (ctx, args) => {
        //verify user has access to this receipt
        const receipt = await ctx.db.get(args.id);
        if(!receipt) {
            throw new Error("Receipt not found")
        }

        const identity = await ctx.auth.getUserIdentity();
        if(!identity) {
            throw new Error("Not authenticated to update this receipt")
        }

        await ctx.db.patch(args.id, {
            status: args.status,
        });

        return true;
    }
})

//delete a receipt and its file
export const deleteReceipt = mutation({
    args: {
        id: v.id("receipts"),
    },
    handler: async (ctx, args) => {
        const receipt = await ctx.db.get(args.id);
        if(!receipt) {
            throw new Error("Receipt not found")
        }

        //verify user has access to this receipt
        const identity = await ctx.auth.getUserIdentity();
        if(!identity) {
            throw new Error("Not authenticated")
        }

        const userId = identity.subject;
        if(receipt.userId !== userId) {
                throw new Error("Not authorized to delete this receipt")
        }

        //delete the file from dtorage
        await ctx.storage.delete(receipt.fileId);

        //delete the receipt record
        await ctx.db.delete(args.id);

        return true;
    },
});

//update a receipt with extracted data
export const updateReceiptWithExtractedData = mutation({
    args: {
        id: v.id("receipts"),
        fileDisplayName: v.string(),
        merchantName: v.string(),
        merchantAddress: v.string(),
        merchantContact: v.string(),
        transactionDate: v.string(),
        transactionAmount: v.string(),
        currency: v.string(),
        receiptSummary: v.string(),
        items: v.array(
            v.object({
                name: v.string(),
                quantity: v.number(),
                unitPrice: v.number(),
                totalPrice: v.number(),
            }),
        ),
    },

    handler: async (ctx, args) => {
        //verify the receipt exists
        const receipt = await ctx.db.get(args.id);
        if(!receipt) {
            throw new Error("Receipt not found")
        }

        //update the receipt with the extracted data
        await ctx.db.patch(args.id, {
            fileDisplayName: args.fileDisplayName,
            merchantName: args.merchantName,
            merchantAddress: args.merchantAddress,
            merchantContact: args.merchantContact,
            transactionDate: args.transactionDate,
            transactionAmount: args.transactionAmount,
            currency: args.currency,
            receiptSummary: args.receiptSummary,
            items: args.items,
            status: "processed",
        })

        return {
            userId: receipt.userId,
        }
    }
})