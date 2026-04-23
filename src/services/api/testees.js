export * from "./testeeApi";
export {
  getMyChildren,
  registerChild,
  searchChildren,
  getChild,
  updateChild,
  deleteChild,
  getChildGuardians,
  addGuardian,
  removeGuardian,
} from "./iamIdentityApi";

export {
  getMyChildren as getMyTesteeProfiles,
  registerChild as registerTesteeProfile,
  searchChildren as searchTesteeProfiles,
  getChild as getTesteeProfile,
  updateChild as updateTesteeProfile,
  deleteChild as deleteTesteeProfile,
  getChildGuardians as getTesteeProfileGuardians,
  addGuardian as addTesteeGuardian,
  removeGuardian as removeTesteeGuardian,
} from "./iamIdentityApi";
