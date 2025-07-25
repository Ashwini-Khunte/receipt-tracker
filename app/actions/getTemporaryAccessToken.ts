"use server"

import { currentUser } from "@clerk/nextjs/server"

// Initialize Schematic SDK
import { SchematicClient } from "@schematichq/schematic-typescript-node";

const apiKey = process.env.SCHEMATIC_API_KEY;
const client = new SchematicClient({ apiKey });

//Get a temporary access token
export async function getTemporaryAccessToken() {
    console.log("Getting temporary access toekn");;
    const user = await currentUser();

    if(!user) {
        console.log("No user found, returning null");
        return null;
    }

    console.log(`Issuing temporary access token for user ${user.id}`);
    const res = await client.accesstokens.issueTemporaryAccessToken({
        resourceType: "company",
        lookup: {id: user.id}, //The lookup will vary depending on how you have configured your componey key
    });

    console.log(
        "Token response received:",
        res.data ? "Token received" : "No token in response"
    );

    return res.data?.token;
    
}