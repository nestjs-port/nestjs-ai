import { Inject } from "@nestjs/common";
import { HTTP_CLIENT_TOKEN } from "../constants";

export const InjectHttpClient = (): ParameterDecorator =>
	Inject(HTTP_CLIENT_TOKEN);
