import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getAllPosts, getAllTags, formatPublishDate, getAllTagsSync, getAllPostsSync } from './utils/blogUtils';
import { BlogPost } from '../types';
import Layout from '../components/Layout';
import MarkdownRenderer from './components/MarkdownRenderer';
import BlogFeaturedSlideshow from '../components/BlogFeaturedSlideshow';
import { MAIN_GROUPS, isMainGroup, getMainGroupForTag, isDisplayableTag } from './data/tagHierarchy';
import { getPillarPosts } from './data/pillarPosts';
import BlogPageBackground from './components/BlogPageBackground';

const FEATURED_COUNT = 8;
const POSTS_PER_PAGE = 9;

const sortByDate = (a: BlogPost, b: BlogPost) => {
  const da = new Date(a.publishedDate || 0).getTime();
  const db = new Date(b.publishedDate || 0).getTime();
  return db - da; // newest first
};

const BlogHome: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const location = useLocation();

  // Scroll to top when blog page loads (prevents browser restoring scroll to bottom)
  useEffect(() => {
    const prev = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    return () => {
      history.scrollRestoration = prev;
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const displayedPosts = useMemo(() => {
    const start = (page - 1) * POSTS_PER_PAGE;
    return filteredPosts.slice(start, start + POSTS_PER_PAGE);
  }, [filteredPosts, page]);

  // Clamp page when filter reduces total pages
  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    const loadBlogData = async () => {
      setIsInitialLoading(true);

      try {
        // Try to use any cached posts first for immediate display
        const cachedPosts = getAllPostsSync();
        const cachedTags = getAllTagsSync();

        if (cachedPosts.length > 0) {
          const sortedCache = [...cachedPosts].sort(sortByDate);
          setPosts(sortedCache);
          setFilteredPosts(sortedCache);
          setTags(cachedTags);
        }

        // Then fetch the latest data and sort by date (newest first)
        const rawPosts = await getAllPosts();
        const allPosts = [...rawPosts].sort(sortByDate);
        setPosts(allPosts);

        const allTags = await getAllTags();
        setTags(allTags);

        // Check if there's a tag in the URL query params
        const params = new URLSearchParams(location.search);
        const tagParam = params.get('tag');

        if (tagParam) {
          setSelectedTag(tagParam);
          setFilteredPosts(allPosts.filter(post => post.tags.includes(tagParam)));
        } else {
          setFilteredPosts(allPosts);
        }
      } catch (error) {
        console.error("Error loading blog data:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadBlogData();
  }, [location.search]);

  const filterPosts = (tag: string | null, term: string) => {
    let result = [...posts];

    // Filter by tag if selected
    if (tag) {
      result = result.filter(post => post.tags.includes(tag));
    }

    // Filter by search term if provided
    if (term.trim()) {
      const lowercaseTerm = term.toLowerCase();
      result = result.filter(post =>
        post.title.toLowerCase().includes(lowercaseTerm) ||
        post.excerpt.toLowerCase().includes(lowercaseTerm) ||
        post.content.toLowerCase().includes(lowercaseTerm) ||
        post.tags.some(t => t.toLowerCase().includes(lowercaseTerm))
      );
    }

    setFilteredPosts(result);
    setPage(1);
  };

  const goToPage = (p: number) => {
    const newPage = Math.max(1, Math.min(p, totalPages));
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTagClick = (tag: string) => {
    const newTag = tag === selectedTag ? null : tag;
    setSelectedTag(newTag);
    filterPosts(newTag, searchTerm);

    // Update URL query parameter
    const params = new URLSearchParams(location.search);
    if (newTag) {
      params.set('tag', newTag);
    } else {
      params.delete('tag');
    }

    const newSearch = params.toString();
    const newURL = newSearch ? `${location.pathname}?${newSearch}` : location.pathname;
    window.history.pushState({}, '', newURL);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    filterPosts(selectedTag, searchTerm);
  };

  const clearFilters = () => {
    setSelectedTag(null);
    setSearchTerm('');
    setFilteredPosts(posts);
    setPage(1);
    window.history.pushState({}, '', location.pathname);
  };

  const featuredPosts = getPillarPosts(posts, FEATURED_COUNT);

  // Filter to allowlist/hierarchy to avoid word-salad in Topics (06-07)
  const displayTags = useMemo(() => {
    const filteredTags = tags.filter(isDisplayableTag);
    const mainGroupTags: string[] = [];
    const subByMain: Record<string, string[]> = {};
    const other: string[] = [];
    for (const tag of filteredTags) {
      if (isMainGroup(tag)) {
        mainGroupTags.push(tag);
      } else {
        const main = getMainGroupForTag(tag);
        if (main) {
          if (!subByMain[main]) subByMain[main] = [];
          if (!subByMain[main].includes(tag)) subByMain[main].push(tag);
        } else {
          other.push(tag);
        }
      }
    }
    const result: { tag: string; isMain: boolean }[] = [];
    for (const t of mainGroupTags) result.push({ tag: t, isMain: true });
    for (const main of MAIN_GROUPS) {
      if (subByMain[main]) {
        for (const t of subByMain[main]) result.push({ tag: t, isMain: false });
      }
    }
    for (const t of other) result.push({ tag: t, isMain: false });
    return result.slice(0, 24);
  }, [tags]);

  return (
    <Layout>
      <div className="relative bg-gray-900 pt-12 pb-20 min-h-screen">
        <BlogPageBackground />
        <div className="relative z-10">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-6 text-center">
            <h1 className="text-4xl font-bold mb-4">The CtrlAltStock Blog</h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Hardware news, shortage alerts, and community-driven tech insights.
            </p>
          </div>

          {/* Featured: automatic slideshow with infinite loop */}
          {!isInitialLoading && posts.length > 0 && (
            <div className="w-full mb-12">
              <BlogFeaturedSlideshow posts={featuredPosts} title="Featured guides" />
            </div>
          )}

          {/* Refined Filtering section */}
          <div className="mb-16 max-w-4xl mx-auto">
            <div className="relative group mb-8">
              <form onSubmit={handleSearchSubmit} className="w-full">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search hardware, stocks, or news articles..."
                  className="w-full bg-gray-800/40 border border-gray-700/50 rounded-2xl pl-14 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-[#9ed04b]/50 text-lg text-white backdrop-blur-xl transition-all shadow-2xl placeholder-gray-500"
                />
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#9ed04b] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
              </form>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Topics</span>
                {(selectedTag || searchTerm) && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-[#9ed04b] hover:opacity-80 flex items-center gap-1 shrink-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {displayTags.map(({ tag, isMain }) => (
                  <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-all duration-200 ${selectedTag === tag
                        ? 'bg-[#9ed04b] border-[#9ed04b] text-gray-900 font-semibold'
                        : 'bg-gray-800/40 border-gray-700/40 text-gray-400 hover:border-[#9ed04b]/40 hover:text-gray-300'
                      } ${isMain ? 'font-semibold' : ''}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {(selectedTag || searchTerm) && (
              <div className="mt-8 text-center animate-fade-in">
                <p className="text-gray-500 text-sm">
                  Showing <span className="text-white font-semibold">{filteredPosts.length}</span> results for
                  <span className="text-[#9ed04b] font-semibold ml-1">
                    {searchTerm ? `"${searchTerm}"` : selectedTag}
                  </span>
                </p>
              </div>
            )}
          </div>

          <div className="max-w-7xl mx-auto mb-8 flex items-center gap-4">
            <h2 className="text-2xl font-bold flex-shrink-0">Recent News</h2>
            <div className="h-[1px] bg-gray-800 w-full"></div>
          </div>

          {/* Blog posts grid */}
          {isInitialLoading ? (
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(POSTS_PER_PAGE)].map((_, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg shadow-lg overflow-hidden animate-pulse">
                    <div className="h-48 bg-gray-700"></div>
                    <div className="p-6 space-y-4">
                      <div className="h-6 bg-gray-700 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-700 rounded"></div>
                      <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                      <div className="h-10 bg-gray-700 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : displayedPosts.length > 0 ? (
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {displayedPosts.map((post) => (
                  <div
                    key={post.id}
                    className="rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-[0_0_24px_rgba(158,208,75,0.15)] hover:-translate-y-1"
                    style={{ background: 'linear-gradient(135deg, rgba(158,208,75,0.04) 0%, rgba(30,41,59,0.95) 100%)' }}
                  >
                    <Link to={`/blog/${post.slug}`} className="block">
                      <div className="h-48 bg-gray-700 relative overflow-hidden">
                        {post.coverImage ? (
                          <img
                            src={post.coverImage}
                            alt={post.title}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800"></div>
                        )}
                      </div>

                      <div className="p-6">
                        <div className="flex flex-wrap gap-2 mb-3">
                          {post.tags.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              className="inline-block text-xs bg-gray-700 text-gray-300 rounded-full px-2 py-1"
                              onClick={(e) => {
                                e.preventDefault();
                                handleTagClick(tag);
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <h3 className="text-xl font-semibold mb-2 text-white hover:text-[#9ed04b] transition-colors">
                          {post.title}
                        </h3>

                        <div className="text-gray-400 text-sm mb-4 prose-sm prose-invert">
                          <MarkdownRenderer content={post.excerpt} />
                        </div>

                        <div className="flex items-center text-gray-500 text-xs">
                          <div className="flex items-center mr-4">
                            <div className="w-6 h-6 rounded-full overflow-hidden mr-2">
                              <img
                                src={post.author?.avatar || '/Logo.png'}
                                alt={post.author?.name || 'CtrlAltStock'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/Logo.png';
                                }}
                              />
                            </div>
                            <span>{post.author?.name || 'CtrlAltStock'}</span>
                          </div>
                          <div>{formatPublishDate(post.publishedDate)} · {post.readingTime}</div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>

              {/* Pagination - always show when there are posts */}
              {filteredPosts.length > 0 && (
                <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-gray-500 text-sm">
                    Showing {(page - 1) * POSTS_PER_PAGE + 1}–{Math.min(page * POSTS_PER_PAGE, filteredPosts.length)} of {filteredPosts.length} posts
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => goToPage(page - 1)}
                      disabled={page <= 1}
                      className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => goToPage(pageNum)}
                            className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                              page === pageNum
                                ? 'bg-[#9ed04b] text-gray-900'
                                : 'bg-gray-800 border border-gray-700 text-white hover:bg-gray-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => goToPage(page + 1)}
                      disabled={page >= totalPages}
                      className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-2xl mx-auto bg-gray-800 rounded-lg p-8 text-center">
              <h3 className="text-xl font-semibold mb-4">No posts found</h3>
              <p className="text-gray-400">
                No articles match your current filters. Try adjusting your search or{' '}
                <button
                  onClick={clearFilters}
                  className="text-[#9ed04b] hover:underline"
                >
                  view all posts
                </button>.
              </p>
            </div>
          )}
        </div>
        </div>
      </div>
    </Layout>
  );
};

export default BlogHome;