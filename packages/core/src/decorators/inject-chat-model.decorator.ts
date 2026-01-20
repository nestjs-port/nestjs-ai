import { Inject } from "@nestjs/common";
import { CHAT_MODEL_TOKEN } from "../constants";

export const InjectChatModel = () => Inject(CHAT_MODEL_TOKEN);
