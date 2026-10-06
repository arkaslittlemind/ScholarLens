import { expect, test } from "@playwright/test";
import { serializeJsonLd } from "../src/components/seo/JsonLd";

const HOSTILE = { name: "a</script><script>alert(1)</script>" };

// The pages only pass constants, so this is the one place a "<" reaches the serializer.
test("JSON-LD serialization escapes < so a string cannot close the script tag", () => {
  const body = serializeJsonLd(HOSTILE);
  expect(body).not.toContain("<");
  expect(JSON.parse(body)).toEqual(HOSTILE);
});
