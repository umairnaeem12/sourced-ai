// Spec 005: test-suite rows are visible only to an admin request from the test suite.
export function visibleOrigin(includeTest: boolean, alias = ""): string {
  return includeTest ? "true" : `${alias ? `${alias}.` : ""}origin <> 'test'`;
}
