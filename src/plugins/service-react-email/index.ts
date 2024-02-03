import {
  BSBError,
  BSBService,
  BSBServiceClient,
} from "@bettercorp/service-base";
import { GeneratedMail, Plugin } from "./plugin";
import { z } from "zod";
import { renderAsync } from "@react-email/render";
import { readdirSync } from "fs";
import { join } from "path";

export class ReactEmail extends BSBServiceClient<Plugin> {
  public readonly pluginName = "service-react-email";
  public readonly initBeforePlugins?: string[] | undefined;
  public readonly initAfterPlugins?: string[] | undefined;
  public readonly runBeforePlugins?: string[] | undefined;
  public readonly runAfterPlugins?: string[] | undefined;
  dispose?(): void;
  run?(): Promise<void>;
  private themeId: string;
  private handlers: Record<
    string, // mailId
    (lang: string, meta: any) => Promise<GeneratedMail>
  > = {};
  private registered = false;
  private doRegister = async () => {
    if (this.registered) return;
    this.registered = true;
    this.log.debug("Registering theme {themeId}", { themeId: this.themeId });
    await this.callMethod(
      "registerTheme",
      this.themeId,
      async (mailId: string, lang: string, meta: any) => {
        if (this.handlers[mailId] === undefined)
          throw new BSBError(
            "NO_HANDLER",
            `Handler for mail [{mailId}] not found`,
            {
              mailId,
            }
          );
        return await this.handlers[mailId](lang, meta);
      }
    );
    this.log.info("Registered theme {themeId}", { themeId: this.themeId });
  };
  async init(): Promise<void> {
    await this.doRegister();
  }
  public constructor(context: BSBService, themeId: string) {
    super(context);
    this.themeId = themeId;
  }

  public async registerTemplate<T extends z.ZodSchema<any, any, any>>(
    id: string,
    name: string,
    description: string,
    langs: Array<string>,
    metaSchema: T,
    exampleData: z.infer<T>,
    handler: (lang: string, meta: z.infer<T>) => Promise<GeneratedMail>
  ) {
    await this.doRegister();
    this.handlers[id] = handler;
    this.log.debug("Registering template {id}", { id });
    await this.callMethod(
      "registerTemplate",
      this.themeId,
      id,
      name,
      description,
      langs,
      metaSchema,
      exampleData
    );
    this.log.info("Registered template {id}", { id });
  }

  public async registerEmailTemplate<T extends typeof ReactEmailTemplateRef>(
    template: T
  ) {
    await this.doRegister();
    this.log.debug("Creating new template");
    const instance = new template();
    this.log.debug("Registering template {id}", { id: instance.id });
    this.handlers[instance.id] = instance.handler;
    await this.callMethod(
      "registerTemplate",
      this.themeId,
      instance.id,
      instance.name,
      instance.description,
      instance.langs,
      instance.metaSchema,
      instance.exampleData
    );
    this.log.info("Registered template {id}", { id: instance.id });
  }

  /// Registers all email templates in the given plugin
  public async registerEmailTemplates(templatesDir: string) {
    await this.doRegister();
    this.log.debug("Registering all templates in {templatesDir}", {
      templatesDir,
    });
    for (const templateFile of readdirSync(templatesDir).filter(
      (f) =>
        [".tsx", ".jsx", ".ts", ".js"].filter((ext) => f.endsWith(ext)).length >
        0
    )) {
      this.log.debug("Importing template {templateFile}", { templateFile });
      const importedFile = await import(join(templatesDir, templateFile));
      if (importedFile.Template === undefined) {
        this.log.warn(
          "Template {templateFile} is not a valid ReactEmailTemplate. Does not export class Template",
          { templateFile }
        );
        continue;
      }
      this.log.debug("Creating template {templateFile}", { templateFile });
      const instance = new importedFile.Template();
      this.log.debug("Registering template {templateFile}", { templateFile });
      this.handlers[instance.id] = instance.handler;
      await this.callMethod(
        "registerTemplate",
        this.themeId,
        instance.id,
        instance.name,
        instance.description,
        instance.langs,
        instance.metaSchema,
        instance.exampleData
      );
      this.log.info("Registered template {templateFile}", { templateFile });
    }
  }
}

export abstract class ReactEmailTemplate {
  constructor() {}
  public abstract readonly id: string;
  public abstract readonly name: string;
  public abstract readonly description: string;
  public abstract readonly langs: Array<string>;
  public abstract readonly metaSchema: z.ZodSchema<any, any, any>;
  public abstract readonly exampleData: z.infer<this["metaSchema"]>;
  public abstract handler(
    lang: string,
    meta: z.infer<this["metaSchema"]>
  ): Promise<GeneratedMail>;
  public static async render(
    subject: string,
    text: string | null,
    template: React.ReactElement<any, string | React.JSXElementConstructor<any>>
  ) {
    return {
      subject,
      html: await renderAsync(template, { pretty: true }),
      plain: await renderAsync(template, { plainText: true }),
      text,
    };
  }
}

export class ReactEmailTemplateRef extends ReactEmailTemplate {
  constructor() {
    super();
  }
  public readonly id: string = "";
  public readonly name: string = "";
  public readonly description: string = "";
  public readonly langs: Array<string> = [];
  public readonly metaSchema: z.ZodSchema<any, any, any> = z.any();
  public readonly exampleData: z.infer<this["metaSchema"]> = {};
  public handler(): //lang: string,
  //meta: z.infer<this["metaSchema"]>
  Promise<GeneratedMail> {
    throw new BSBError("NOT_IMPLEMENTED", "Handler not implemented");
  }
}
