import {
  BSBPluginConfig,
  BSBPluginEvents,
  BSBService,
  BSBServiceConstructor,
  ServiceEventsBase,
} from "@bettercorp/service-base";
import { z } from "zod";
import { ReactEmail } from "../service-react-email";
// import { Template as AirBNBReview } from "./emails/airbnb-review";
// import { Template as AppleReceipt } from "./emails/apple-receipt";
// import { Template as EmailVerification } from "./emails/email-verification";

export interface Events extends BSBPluginEvents {
  onEvents: ServiceEventsBase;
  emitEvents: ServiceEventsBase;
  onReturnableEvents: ServiceEventsBase;
  emitReturnableEvents: ServiceEventsBase;
  onBroadcast: ServiceEventsBase;
  emitBroadcast: ServiceEventsBase;
}

const secSchema = z.object({});

export class Config extends BSBPluginConfig<typeof secSchema> {
  validationSchema = secSchema;

  migrate(
    toVersion: string,
    fromVersion: string | null,
    fromConfig: any | null
  ) {
    return fromConfig;
  }
}
export class Plugin extends BSBService<Config, Events> {
  initBeforePlugins?: string[] | undefined;
  initAfterPlugins?: string[] | undefined;
  runBeforePlugins?: string[] | undefined;
  runAfterPlugins?: string[] | undefined;
  methods = {};
  dispose?(): void;
  run?(): void | Promise<void>;
  private ReactEmail: ReactEmail;
  constructor(config: BSBServiceConstructor) {
    super(config);
    this.ReactEmail = new ReactEmail(
      this,
      "09a84d30-ca86-57ac-952f-9bf0c1982889"
    );
  }

  public async init(): Promise<void> {
    // await this.ReactEmail.registerEmailTemplate(AirBNBReview);
    // await this.ReactEmail.registerEmailTemplate(AppleReceipt);
    // await this.ReactEmail.registerEmailTemplate(EmailVerification);
    await this.ReactEmail.registerEmailTemplates(this.pluginCwd + "/emails");
  }
}
