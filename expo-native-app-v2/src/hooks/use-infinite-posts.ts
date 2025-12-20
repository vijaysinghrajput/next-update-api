import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useInfinitePosts(cityId: string | null = null, userId: string | null = null) {
    return useInfiniteQuery({
        queryKey: ['posts', 'infinite', cityId, userId],
        queryFn: async ({ pageParam = 0 }) => {
            // Start building the query
            let query = supabase
                .from('posts')
                .select(`
          *,
          profiles:user_id (id, name, avatar_url, is_verified, has_blue_tick),
          cities:city_id (name),
          post_likes (user_id),
          saved_posts (user_id)
        `, { count: 'exact' })
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .range(pageParam, pageParam + 9); // Load 10 at a time

            // Filter by city if provided
            if (cityId) {
                query = query.eq('city_id', cityId);
            }

            const { data, error, count } = await query;

            if (error) {
                throw error;
            }

            // Check current user likes/saves (if strictly needed on client side logic, 
            // but the select above includes basic relation data)
            // Note: In a real app we might want to transform this data to add 'isLiked' boolean easily
            // based on the current user session.

            const { data: { session } } = await supabase.auth.getSession();
            const currentUserId = session?.user?.id;

            const posts = data.map(post => ({
                ...post,
                isLiked: currentUserId ? post.post_likes?.some((like: any) => like.user_id === currentUserId) : false,
                isSaved: currentUserId ? post.saved_posts?.some((save: any) => save.user_id === currentUserId) : false,
            }));

            return {
                posts,
                nextPage: (count && pageParam + 10 < count) ? pageParam + 10 : undefined,
                total: count
            };
        },
        getNextPageParam: (lastPage) => lastPage.nextPage,
        initialPageParam: 0,
        staleTime: 1000 * 60 * 1, // 1 minute
    });
}
