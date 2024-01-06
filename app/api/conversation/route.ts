import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import OpenAI from "openai";

import { increaseApiUseCount, checkApiUseCount } from "@/lib/api-limit";

enum StatusCodesEnum {
    BadRequest = 400,
    Unauthorised = 401,
    InternalServerError = 500
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
    try {
        const { userId } = auth();
        const body = await req.json();
        const { messages } = body

        if (!userId) {
            return new NextResponse("Unauthorised", { status: StatusCodesEnum.Unauthorised })
        }

        if (!openai.apiKey) {
            return new NextResponse("OpenAI API Key not configured", { status: StatusCodesEnum.InternalServerError })
        }

        if (!messages) {
            return new NextResponse("Messages are required", { status: StatusCodesEnum.BadRequest })
        }

        const freeTrial = await checkApiUseCount();

        if (!freeTrial) {
            return new NextResponse("Free trial has expired", { status: 403 })
        }

        await increaseApiUseCount();

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages
        })

        return NextResponse.json(response.choices[0].message)

    } catch (error) {
        console.log("[CONVERSATION_ERROR]", error);
        return new NextResponse("Internal Error", { status: StatusCodesEnum.BadRequest });
    }
}