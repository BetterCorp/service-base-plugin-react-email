import {
  BSBError,
  BSBPluginConfig,
  BSBPluginEvents,
  BSBService,
  BSBServiceConstructor,
  ServiceEventsBase,
} from "@bettercorp/service-base";
import { z } from "zod";
import { Fastify } from "@bettercorp/service-base-plugin-fastify";
import { fastifyFormbody } from "@fastify/formbody";

export type GeneratedMail = {
  subject: string;
  plain: string;
  html: string;
  text: string | null;
};

export type ZANY = z.ZodSchema<any, any, any>;
export type MailTemplate<T extends ZANY> = {
  id: string;
  name: string;
  description: string;
  langs: Array<string>;
  metaSchema: T;
  exampleData: z.infer<T>;
};

export interface Events extends BSBPluginEvents {
  onEvents: ServiceEventsBase;
  emitEvents: ServiceEventsBase;
  onReturnableEvents: {
    GenerateEmail: {
      (
        themeId: string,
        mailId: string,
        lang: string,
        meta: any
      ): Promise<GeneratedMail>;
    };
    GetThemes: {
      (): Promise<Array<string>>;
    };
    GetTemplates: {
      (themeId: string): Promise<Array<MailTemplate<ZANY>>>;
    };
  };
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
  private knownThemes: Record<
    string,
    {
      templates: Array<MailTemplate<ZANY>>;
      handler: {
        (mailId: string, lang: string, meta: any): Promise<GeneratedMail>;
      };
    }
  > = {};
  methods = {
    registerTemplate: async (
      themeId: string,
      id: string,
      name: string,
      description: string,
      langs: Array<string>,
      metaSchema: ZANY,
      exampleData: z.infer<ZANY>
    ): Promise<void> => {
      if (this.knownThemes[themeId] === undefined)
        throw new BSBError("NO_THEME", `Theme [{themeId}] not found`, {
          themeId,
        });
      this.knownThemes[themeId].templates.push({
        id,
        name,
        description,
        langs,
        metaSchema,
        exampleData,
      });
    },
    registerTheme: async (
      themeId: string,
      handler: {
        (mailId: string, lang: string, meta: any): Promise<GeneratedMail>;
      }
    ): Promise<void> => {
      if (this.knownThemes[themeId] !== undefined)
        this.log.error("Theme [{themeId}] already registered", {
          themeId,
        });
      this.knownThemes[themeId] = { templates: [], handler };
      this.log.info("Theme [{themeId}] registered.", {
        themeId,
      });
    },
  };
  dispose?(): void;
  run?(): void | Promise<void>;
  private fastify!: Fastify;
  constructor(config: BSBServiceConstructor) {
    super(config);
    if (this.mode === "development") {
      this.fastify = new Fastify(this);
    }
  }

  private validateAndGenerateEmail = async (
    themeId: string,
    mailId: string,
    lang: string,
    meta: any
  ): Promise<GeneratedMail> => {
    if (this.knownThemes[themeId] === undefined)
      throw new BSBError("NO_THEME", `Theme [{themeId}] not found`, {
        themeId,
      });
    const theme = this.knownThemes[themeId];
    const template = theme.templates.find((t) => t.id === mailId);
    if (template === undefined)
      throw new BSBError(
        "NO_TEMPLATE",
        `Template [{mailId}] not found in theme [{themeId}]`,
        {
          mailId,
          themeId,
        }
      );
    if (meta === undefined || meta === null)
      throw new BSBError(
        "NO_META",
        `No meta provided for template [{mailId}] in theme [{themeId}]`,
        { mailId, themeId }
      );
    const validMeta = await template.metaSchema.safeParseAsync(meta);
    if (validMeta.success === false)
      throw new BSBError(
        "INVALID_META",
        `Invalid meta for template [{mailId}] in theme [{themeId}] - {errors}`,
        {
          mailId,
          themeId,
          errors: validMeta.error.errors
            .map((x) => `(${x.path}: ${x.message})`)
            .join(", "),
        }
      );
    if (!template.langs.includes(lang))
      this.log.warn(
        "Template [{mailId}] in theme [{themeId}] does not support language [{lang}]",
        { mailId, themeId, lang }
      );
    this.log.info("Generating email [{mailId}] from theme [{themeId}]", {
      mailId,
      themeId,
    });
    return await theme.handler(mailId, lang, validMeta.data);
  };

  public async init(): Promise<void> {
    await this.events.onReturnableEvent("GetThemes", async () => {
      return Object.keys(this.knownThemes);
    });
    await this.events.onReturnableEvent("GetTemplates", async (themeId) => {
      return this.knownThemes[themeId]?.templates ?? [];
    });
    await this.events.onReturnableEvent(
      "GenerateEmail",
      this.validateAndGenerateEmail
    );

    // DEV MODE ONLY
    if (this.mode === "development") {
      const headCode =
        '<head><meta name="viewport" content="width=device-width, height=device-height, initial-scale=1.0, minimum-scale=1.0"></head>';
      await this.fastify.register(fastifyFormbody, {});
      this.fastify.get("/favicon.ico", async (reply, params) => {
        reply.status(404).send();
      });
      this.fastify.get("/:themeId/favicon.ico", async (reply, params) => {
        reply.status(404).send();
      });
      this.fastify.get(
        "/:themeId/:emailId/favicon.ico",
        async (reply, params) => {
          reply.status(404).send();
        }
      );
      this.fastify.get("//", async (reply, params) => {
        reply.header("Content-Type", "text/html");
        return reply.send(
          `<html>${headCode}<body>` +
            `<h1>Themes: </h1><br/>` +
            `<ul>` +
            Object.keys(this.knownThemes)
              .map((themeId) => `<li><a href="/${themeId}">${themeId}</a></li>`)
              .join("") +
            `</ul>` +
            `</body></html>`
        );
      });
      this.fastify.get("/:themeId/", async (reply, params) => {
        reply.header("Content-Type", "text/html");
        if (this.knownThemes[params.themeId] === undefined) {
          return reply.redirect("/");
        }
        return reply.send(
          `<html>${headCode}<body>` +
            `<a href="/">BACK</a>` +
            `<h1>Templates for theme [${params.themeId}]: </h1><br/>` +
            `<ul>` +
            (this.knownThemes[params.themeId]?.templates ?? [])
              .map(
                (template) =>
                  `<li><a href="/${params.themeId}/${template.id}">${template.name}</a></li>`
              )
              .join("") +
            `</ul>` +
            `</body></html>`
        );
      });
      const getTemplateFormBase = (
        themeId: string,
        emailId: string,
        template: MailTemplate<ZANY>,
        data: any,
        newHTML: string
      ) => {
        const refData = data ?? template.exampleData;
        return (
          `<html>${headCode}<body>` +
          `<a href="/${themeId}">BACK</a>` +
          `<h1>Template [${template.name}] for theme [${themeId}]: </h1><br/>` +
          `<form method="post" action="/${themeId}/${emailId}">` +
          Object.keys(refData)
            .map(
              (key) =>
                `<label for="${key}" style="margin-right: 10px;">${key}</label><input type="text" name="${key}" id="${key}" value="${refData[key]}"/>`
            )
            .join("<br/>") +
          `<br /><br /><input type="submit" value="Generate Email"/>` +
          `</form>` +
          newHTML +
          `</body></html>`
        );
      };
      this.fastify.get("/:themeId/:emailId/", async (reply, params) => {
        if (this.knownThemes[params.themeId] === undefined) {
          return reply.redirect(`/`);
        }
        const template = this.knownThemes[params.themeId].templates.find(
          (t) => t.id === params.emailId
        );
        if (template === undefined) {
          return reply.redirect(`/${params.themeId}`);
        }
        reply.header("Content-Type", "text/html");
        return reply.send(
          getTemplateFormBase(
            params.themeId,
            params.emailId,
            template,
            null,
            ""
          )
        );
      });
      this.fastify.post(
        "/:themeId/:emailId/",
        async (reply, params, query, body) => {
          if (this.knownThemes[params.themeId] === undefined) {
            return reply.redirect(`/`);
          }
          const template = this.knownThemes[params.themeId].templates.find(
            (t) => t.id === params.emailId
          );
          if (template === undefined) {
            return reply.redirect(`/${params.themeId}`);
          }
          reply.header("Content-Type", "text/html");
          let generatedTemplate: GeneratedMail = {
            subject: "ERROR",
            plain: "ERROR",
            html: "ERROR",
            text: "ERROR",
          };
          try {
            generatedTemplate = await this.validateAndGenerateEmail(
              params.themeId,
              params.emailId,
              "en",
              body
            );
          } catch (e: any) {
            generatedTemplate.plain = e.message ?? e;
          }
          const boxStyle = `box-shadow: 0px 10px 15px -3px rgba(0,0,0,0.1); border: 1px solid #333333; border-radius: 1rem; overflow: hidden; overflow-x: auto; min-width: 300px; max-width: 20%; margin-top: 20px; margin-bottom: 20px;`;
          const geneHtml =
            `<div style="width: 100%;display: flex;justify-content: space-evenly;flex-wrap: wrap;flex-direction: row;align-items: flex-start;">` +
            `<div style="${boxStyle}">${generatedTemplate.html}</div>` +
            `<div style="${boxStyle} padding: 10px;">${generatedTemplate.plain.replace(
              "\n",
              "<br />"
            )}</div>` +
            `<div style="${boxStyle} padding: 10px;">${generatedTemplate.text}</div>` +
            `<div style="${boxStyle} padding: 10px;"><pre>${JSON.stringify(
              body,
              null,
              2
            ).replace("\n", "<br/>")}</pre></div>` +
            `</div>` +
            `<div style="width: 100%; margin-top: 40px; margin-bottom: 40px; box-shadow: 0px 10px 15px -3px rgba(0,0,0,0.1); background: rgb(242,242,242)">${generatedTemplate.html}</div>`;
          reply.send(
            getTemplateFormBase(
              params.themeId,
              params.emailId,
              template,
              body,
              `<h1>Generated Email:</h1><br />${geneHtml}`
            )
          );
        }
      );
    }
    // DEV MODE ONLY
  }
}
