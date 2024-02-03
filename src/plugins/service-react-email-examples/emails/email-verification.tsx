import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { ReactEmailTemplate } from "../../service-react-email";
import { GeneratedMail } from "../../service-react-email/plugin";
import { z } from "zod";

export class Template extends ReactEmailTemplate {
  public id: string = "email-verification";
  public name: string = "Verification Email";
  public description: string = "This is a verification email";
  public langs: string[] = ["en"];
  public metaSchema: z.ZodType<any, any, any> = z.object({
    otp: z
      .string()
      .min(5)
      .max(10)
      .regex(/^[0-9A-Za-z-]+$/),
    headerColour: z.string(),
    companyLogo: z.string().optional(),
    companyName: z.string(),
  });
  public exampleData: z.TypeOf<this["metaSchema"]> = {
    otp: "12345",
    headerColour: "#000000",
    companyLogo:
      "https://www.google.com/images/branding/googlelogo/1x/googlelogo_light_color_272x92dp.png",
    companyName: "Company Name",
  };
  public async handler(
    lang: string,
    meta: z.TypeOf<this["metaSchema"]>
  ): Promise<GeneratedMail> {
    const template = (
      <Html>
        <Head />
        <Preview>AWS Email Verification</Preview>
        <Body style={main}>
          <Container style={container}>
            <Section style={coverSection}>
              <Section style={imageSection}>
                {meta.companyLogo ? (
                  <Img
                    src={meta.companyLogo}
                    width="75"
                    height="45"
                    alt={`${meta.companyName} Logo`}
                  />
                ) : (
                  <h1 style={{ height: "45px" }}>{meta.companyName}</h1>
                )}
              </Section>
              <Section style={upperSection}>
                <Heading style={h1}>Verify your email address</Heading>
                <Text style={mainText}>
                  Thanks for starting the new AWS account creation process. We
                  want to make sure it's really you. Please enter the following
                  verification code when prompted. If you don&apos;t want to
                  create an account, you can ignore this message.
                </Text>
                <Section style={verificationSection}>
                  <Text style={verifyText}>Verification code</Text>

                  <Text style={codeText}>{meta.otp}</Text>
                  <Text style={validityText}>
                    (This code is valid for 10 minutes)
                  </Text>
                </Section>
              </Section>
              <Hr />
              <Section style={lowerSection}>
                <Text style={cautionText}>
                  Amazon Web Services will never email you and ask you to
                  disclose or verify your password, credit card, or banking
                  account number.
                </Text>
              </Section>
            </Section>
            <Text style={footerText}>
              This message was produced and distributed by Amazon Web Services,
              Inc., 410 Terry Ave. North, Seattle, WA 98109. © 2022, Amazon Web
              Services, Inc.. All rights reserved. AWS is a registered trademark
              of{" "}
              <Link href="https://amazon.com" target="_blank" style={link}>
                {meta.companyName}
              </Link>
              , Inc. View our{" "}
              <Link href="https://amazon.com" target="_blank" style={link}>
                privacy policy
              </Link>
              .
            </Text>
          </Container>
        </Body>
      </Html>
    );

    return await ReactEmailTemplate.render(
      "Verification Email",
      `[${meta.companyName}] Verification code: ${meta.otp}`,
      template
    );
  }
}

const main = {
  backgroundColor: "#fff",
  color: "#212121",
};

const container = {
  padding: "20px",
  margin: "0 auto",
  backgroundColor: "#eee",
};

const h1 = {
  color: "#333",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "20px",
  fontWeight: "bold",
  marginBottom: "15px",
};

const link = {
  color: "#2754C5",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "14px",
  textDecoration: "underline",
};

const text = {
  color: "#333",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "14px",
  margin: "24px 0",
};

const imageSection = {
  backgroundColor: "#252f3d",
  display: "flex",
  padding: "20px 0",
  alignItems: "center",
  justifyContent: "center",
};

const coverSection = { backgroundColor: "#fff" };

const upperSection = { padding: "25px 35px" };

const lowerSection = { padding: "25px 35px" };

const footerText = {
  ...text,
  fontSize: "12px",
  padding: "0 20px",
};

const verifyText = {
  ...text,
  margin: 0,
  fontWeight: "bold",
  textAlign: "center" as const,
};

const codeText = {
  ...text,
  fontWeight: "bold",
  fontSize: "36px",
  margin: "10px 0",
  textAlign: "center" as const,
};

const validityText = {
  ...text,
  margin: "0px",
  textAlign: "center" as const,
};

const verificationSection = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const mainText = { ...text, marginBottom: "14px" };

const cautionText = { ...text, margin: "0px" };
