/** A CAPTCHA inside the application form (Lever) is not a robot check; a block page still is (round 12). */
import { describe, expect, it } from "vitest";
import { detectChallenge, hasCaptcha } from "../src/content/detect";
import { mount } from "./fixtures";

describe("CAPTCHA in the form vs a robot-check page", () => {
  it("Lever: an hCaptcha inside the application form does not stop filling (the user still solves it at Submit)", () => {
    mount(`<form id="application-form"><input name="name"><input name="email"><input name="phone"><input name="org">
      <div class="h-captcha" data-sitekey="x"></div><button type="submit">Submit application</button></form>`);
    expect(hasCaptcha(document)).toBe(true);
    expect(detectChallenge(document)).toBeNull();
  });
  it("a CAPTCHA page with no form, or a block-page checker, still stops it", () => {
    mount(`<h1>Checking</h1><div class="h-captcha"></div>`);
    expect(detectChallenge(document)).toMatchObject({ kind: "captcha" });
    mount(`<form><input name="a"><input name="b"><input name="c"><iframe src="https://geo.captcha-delivery.com/captcha/"></iframe></form>`);
    expect(detectChallenge(document)).toMatchObject({ kind: "captcha" });
    mount(`<form><input name="a"><div class="h-captcha"></div></form>`); // one field: not an application form
    expect(detectChallenge(document)).toMatchObject({ kind: "captcha" });
  });
});
