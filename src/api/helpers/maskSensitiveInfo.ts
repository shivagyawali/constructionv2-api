export const maskSensitiveInfo = <T>(items: T[]): T[] => {
  return items.map((item:any) => {
      const { email,password,isVerified,role,isPasswordChangeRequired,isSubAccount,isActive,updatedAt,createdAt, ...rest } = item;
      return { ...rest}; 
  });
};
