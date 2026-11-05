/** Profile screen: the resume card leads the screen, and location is Country → State → City with suggestion lists
 * that follow each other. A state or city that belongs elsewhere is cleared with a note; any real place can still
 * be typed; saved spellings (Bangalore) keep working; the saved keys (country, state, location) are unchanged. */
import type { Profile } from "../src/shared/types";
import { expect, getStorage, goTo, PROFILE, setStorage, test } from "./fixtures";

const field = (ext: import("@playwright/test").Page, name: string) => ext.locator(`#profile-form input[name='${name}']`);

async function commit(ext: import("@playwright/test").Page, name: string, value: string): Promise<void> {
  await field(ext, name).fill(value);
  await field(ext, name).press("Tab"); // leaving the field commits it (change event)
}

test("the resume card comes first, says it reads on this device and asks first, and shows the saved file", async ({ ext }) => {
  await setStorage(ext, { profile: PROFILE });
  await ext.reload();
  await goTo(ext, "profile");
  const first = ext.locator("#sec-profile > .card").first();
  await expect(first).toHaveAttribute("id", "resume-card");
  await expect(first.locator("h2")).toHaveText("Fill your profile from your resume");
  await expect(first).toContainText("on this device");
  await expect(first).toContainText("asks before using anything");
  await expect(first.locator("#resume")).toHaveCount(1);
  await expect(ext.locator("#resume-name")).toHaveText(PROFILE.resume!.name);
  await expect(ext.locator("#read-resume-btn")).toBeVisible();
});

test("State and City lists follow the country; a new state clears a city of the old one, with a note", async ({ ext }) => {
  await setStorage(ext, { profile: { ...PROFILE, country: "India", state: "Maharashtra", location: "Pune" } });
  await ext.reload();
  await goTo(ext, "profile");
  await expect(ext.locator("#state-list option[value='Karnataka']")).toHaveCount(1);
  await expect(ext.locator("#city-suggestions option[value='Nagpur']")).toHaveCount(1);
  await expect(ext.locator("#city-suggestions option[value='Mysuru']")).toHaveCount(0);

  await commit(ext, "state", "Karnataka");
  await expect(field(ext, "location")).toHaveValue("");
  await expect(ext.locator("#place-note")).toContainText('Cleared City "Pune"');
  await expect(ext.locator("#city-suggestions option[value='Mysuru']")).toHaveCount(1);

  await commit(ext, "location", "Mysuru");
  await ext.locator("#save-profile").click();
  await expect.poll(async () => (await getStorage<Profile>(ext, "profile"))?.location).toBe("Mysuru");
  const p = await getStorage<Profile>(ext, "profile");
  expect(p?.state).toBe("Karnataka");
  expect(p?.country).toBe("India");
});

test("a new country clears a state and city of the old one; the State list follows", async ({ ext }) => {
  await setStorage(ext, { profile: { ...PROFILE, country: "India", state: "Karnataka", location: "Bengaluru" } });
  await ext.reload();
  await goTo(ext, "profile");
  await commit(ext, "country", "Australia");
  await expect(field(ext, "state")).toHaveValue("");
  await expect(field(ext, "location")).toHaveValue("");
  await expect(ext.locator("#place-note")).toContainText("not in Australia");
  await expect(ext.locator("#state-list option[value='Victoria']")).toHaveCount(1);
  await commit(ext, "state", "Victoria");
  await expect(ext.locator("#city-suggestions option[value='Melbourne']")).toHaveCount(1);
});

test("a saved 'Bangalore' stays valid, and a town that is not in the list can be typed and saved", async ({ ext }) => {
  await setStorage(ext, { profile: { ...PROFILE, country: "India", state: "Karnataka", location: "Bangalore" } });
  await ext.reload();
  await goTo(ext, "profile");
  await expect(field(ext, "location")).toHaveValue("Bangalore");
  await expect(ext.locator("[data-note-for='location']")).toHaveText("");
  await commit(ext, "location", "Sakleshpur");
  await ext.locator("#save-profile").click();
  await expect.poll(async () => (await getStorage<Profile>(ext, "profile"))?.location).toBe("Sakleshpur");
  expect((await getStorage<Profile>(ext, "profile"))?.state).toBe("Karnataka");
});
