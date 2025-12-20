export interface Comment {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    profiles: {
        id: string;
        name: string;
        avatar_url: string | null;
        is_verified?: boolean | null;
    };
}
