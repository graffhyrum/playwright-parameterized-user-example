import type {TestableEnvironment, User, UserTier} from "./types.ts";

export function getUserManager(
    tier: UserTier,
    thisEnvironment: TestableEnvironment,
) {
    return {
        create: async (): Promise<User> => {
            // Create the user
            return Promise.resolve({
                tier,
                env: thisEnvironment,
                username: 'username',
                password: 'password'
            })
        },
        delete: async (user: User) => {
            // Delete the user
        },
    };
}
