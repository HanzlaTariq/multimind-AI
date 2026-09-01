// Turns a flat list of recent posts (the common shape returned by
// lib/socialPosting.js's getFacebookRecentPosts/getInstagramRecentPosts)
// into the numbers Growth Suggestions actually grounds its AI prompt in:
// best posting time, which of the account's own hashtags correlate with
// higher engagement, and its best- and worst-performing recent posts.
//
// Deliberately simple (mean/count, no statistical significance testing) —
// this is directional pattern-spotting over a small personal sample, not
// a claim of causation, and the UI/prompt both say so.

const HASHTAG_RE = /#(\w+)/g;

function engagementOf(post) {
  return (post.likeCount || 0) + (post.commentCount || 0) + (post.shareCount || 0);
}

/** Local hour-of-day (0-23) and day-of-week (0=Sun) the post went out, from its own timestamp. */
function timeParts(createdAt) {
  const d = new Date(createdAt);
  return { hour: d.getHours(), day: d.getDay() };
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function averageByBucket(posts, bucketFn) {
  const buckets = new Map(); // bucket -> { sum, count }
  for (const post of posts) {
    const bucket = bucketFn(post);
    const cur = buckets.get(bucket) || { sum: 0, count: 0 };
    cur.sum += engagementOf(post);
    cur.count += 1;
    buckets.set(bucket, cur);
  }
  return [...buckets.entries()]
    .map(([bucket, { sum, count }]) => ({ bucket, avgEngagement: sum / count, postCount: count }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);
}

function topHashtags(posts, limit = 5) {
  const byTag = new Map(); // tag -> { sum, count }
  for (const post of posts) {
    const tags = new Set((post.text.match(HASHTAG_RE) || []).map((t) => t.toLowerCase()));
    for (const tag of tags) {
      const cur = byTag.get(tag) || { sum: 0, count: 0 };
      cur.sum += engagementOf(post);
      cur.count += 1;
      byTag.set(tag, cur);
    }
  }
  return [...byTag.entries()]
    .map(([tag, { sum, count }]) => ({ tag, useCount: count, avgEngagement: sum / count }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement)
    .slice(0, limit);
}

/**
 * @param {Array} posts - common shape from lib/socialPosting.js's post-history functions
 * @returns stats object, or `{ insufficientData: true }` when there's too little history to say anything honest
 */
export function computeEngagementStats(posts) {
  const withDates = posts.filter((p) => p.createdAt);
  if (withDates.length < 3) {
    return { insufficientData: true, totalPosts: posts.length };
  }

  const withEngagement = withDates.map((p) => ({ ...p, engagement: engagementOf(p) }));
  const totalEngagement = withEngagement.reduce((s, p) => s + p.engagement, 0);

  const hourRanking = averageByBucket(withDates, (p) => timeParts(p.createdAt).hour);
  const dayRanking = averageByBucket(withDates, (p) => DAY_NAMES[timeParts(p.createdAt).day]);

  const sortedByEngagement = [...withEngagement].sort((a, b) => b.engagement - a.engagement);

  return {
    insufficientData: false,
    totalPosts: withDates.length,
    avgEngagement: totalEngagement / withDates.length,
    bestHour: hourRanking[0] || null,
    bestDay: dayRanking[0] || null,
    hourRanking,
    dayRanking,
    topHashtags: topHashtags(withDates),
    topPosts: sortedByEngagement.slice(0, 3),
    lowestPosts: sortedByEngagement.slice(-3).reverse(),
  };
}
