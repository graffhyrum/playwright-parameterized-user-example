import type {TestableEnvironment, User, UserTier} from "./types.ts";

export function getUserManager(
    tier: UserTier,
    thisEnvironment: TestableEnvironment,
) {
    return {
        create: async (): Promise<User> => {
            // Return demo users that exist in the demo app
            const email = tier === 'free' ? 'user@free.com' : 'user@paid.com';

            return Promise.resolve({
                tier,
                env: thisEnvironment,
                username: email,
                password: 'password123'
            })
        },
        delete: async (user: User) => {
            // Demo users are persistent, no cleanup needed
        },
    };
}
