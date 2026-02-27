import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MarkdownRenderer from './components/MarkdownRenderer';
import BlockRenderer from './components/BlockRenderer';
import Layout from '../components/Layout';
import { BlogPost as BlogPostType, Product as BlogProduct } from '../types.d';
import { ArrowLeft, Calendar } from 'lucide-react';
import { getRelatedProductsFromAffiliateList } from './data/productData';
import { getPostBySlug, getAllPosts, formatPublishDate, savePost, getRelatedPostsByTopic } from './utils/blogUtils';
import { ShoppingCart, ExternalLink } from 'react-feather';
import { AmazonProductGrid } from './components/AmazonProductCard';
import ArticleDiscordCTA from './components/ArticleDiscordCTA';
import BlogPageBackground from './components/BlogPageBackground';
import { useToast } from '../components/Toast';

const BlogPost: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<BlogProduct[]>([]);
  const [relatedPosts, setRelatedPosts] = useState<BlogPostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!slug) {
          throw new Error('No slug provided');
        }

        const fetchedPost = await getPostBySlug(slug);

        if (!fetchedPost) {
          throw new Error('Post not found');
        }

        setPost(fetchedPost);

        // Set recommended products from curated affiliate list (matched by tags)
        if (fetchedPost.tags && fetchedPost.tags.length > 0) {
          const recommended = await getRelatedProductsFromAffiliateList(fetchedPost.tags, 6);
          setRecommendedProducts(recommended);
        } else {
          const recommended = await getRelatedProductsFromAffiliateList([], 6);
          setRecommendedProducts(recommended);
        }

        // Load related posts by topic (shared tags); optionally boost from relatedPostSlugs
        try {
          const allPosts = await getAllPosts();
          let related = getRelatedPostsByTopic(fetchedPost, allPosts, 4);
          const relatedSlugs: string[] = fetchedPost.relatedPostSlugs || [];
          if (relatedSlugs.length > 0) {
            const boostPosts = allPosts.filter(
              (p) => relatedSlugs.includes(p.slug) && p.slug !== fetchedPost.slug
            );
            related = [...new Map([...boostPosts, ...related].map((p) => [p.slug, p])).values()].slice(0, 4);
          }
          setRelatedPosts(related);
        } catch { /* ignore */ }
      } catch (err) {
        console.error('Error loading blog post:', err);
        setError(err instanceof Error ? err.message : 'Failed to load blog post');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug]);

  const handleGoBack = () => {
    navigate(-1);
  };

  // Custom RecommendedProducts component to avoid type issues
  const RecommendedProductsSection = ({ products }: { products: BlogProduct[] }) => {
    if (!products || products.length === 0) return null;

    return (
      <div className="bg-gray-800 rounded-lg p-6 mt-8">
        <div className="flex items-center mb-6">
          <ShoppingCart className="w-6 h-6 text-[#9ed04b] mr-2" />
          <h2 className="text-xl font-semibold">Recommended Products</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <a
              key={product.id}
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              <div className="aspect-w-16 aspect-h-9 relative bg-gray-800">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 flex items-center justify-center text-gray-500 text-sm">
                    View on Amazon
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-[#9ed04b] text-gray-900 px-3 py-1 rounded-full font-medium">
                  {product.price}
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2 text-white group-hover:text-[#9ed04b] transition-colors">
                  {product.name}
                </h3>
                <p className="text-gray-400 text-sm mb-3">
                  {product.description}
                </p>
                <div className="flex items-center text-[#9ed04b]">
                  <span className="text-sm">View Details</span>
                  <ExternalLink className="w-4 h-4 ml-1" />
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="relative min-h-screen bg-gray-900 pt-16 pb-20">
          <BlogPageBackground />
          <div className="relative z-10 container mx-auto px-4 flex justify-center items-center min-h-[60vh]">
            <div className="rounded-2xl border border-gray-700/50 bg-gray-800/50 backdrop-blur-xl p-12">
              <div className="animate-spin w-10 h-10 border-4 border-gray-300 border-t-[#9ed04b] rounded-full"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !post) {
    return (
      <Layout>
        <div className="relative min-h-screen bg-gray-900 pt-16 pb-20">
          <BlogPageBackground />
          <div className="relative z-10 container mx-auto px-4">
            <div className="max-w-3xl mx-auto rounded-2xl border border-gray-700/50 bg-gray-800/50 backdrop-blur-xl p-8 text-center">
              <h1 className="text-2xl font-bold mb-4">Error Loading Post</h1>
              <p className="text-gray-300 mb-8">{error || 'The requested blog post could not be found.'}</p>
              <Link to="/blog" className="inline-flex items-center bg-[#9ed04b] text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-[#9ed04b]/90 transition-colors">
                <ArrowLeft className="w-5 h-5 mr-2" /> Return to Blog
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="relative bg-gray-900 pt-8 pb-20 min-h-screen">
        <BlogPageBackground />
        <div className="relative z-10 container mx-auto px-4">
          <div className="max-w-4xl mx-auto rounded-2xl border border-gray-700/50 bg-gray-800/50 backdrop-blur-xl overflow-hidden shadow-2xl">
            <div className="p-6 md:p-8 lg:p-10">
          {/* Back Button */}
          <div className="mb-6">
            <button
              onClick={handleGoBack}
              className="inline-flex items-center text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-1" /> Back
            </button>
          </div>

          {/* Post Header */}
          <div className="max-w-4xl mx-auto mb-12">
            <div className="mb-6 flex gap-2 flex-wrap">
              {post.tags.map(tag => (
                <Link
                  key={tag}
                  to={`/blog?tag=${encodeURIComponent(tag)}`}
                  className="inline-block text-sm bg-gray-800 text-gray-300 rounded-full px-3 py-1 hover:bg-gray-700 transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">{post.title}</h1>

            <div className="flex items-center text-gray-400 mb-8">
              <div className="flex items-center mr-6">
                <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                  <img
                    src={post.author?.avatar || '/Logo.png'}
                    alt={post.author?.name || 'CtrlAltStock team'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/Logo.png';
                    }}
                  />
                </div>
                <div>
                  <div className="font-medium text-white">{post.author?.name || 'CtrlAltStock'}</div>
                  {post.author?.bio && <div className="text-sm">{post.author.bio}</div>}
                </div>
              </div>

              <div className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                <span>{formatPublishDate(post.publishedDate)} · {post.readingTime}</span>
              </div>
            </div>

            {/* Cover Image */}
            {post.coverImage && (
              <div className="rounded-lg overflow-hidden mb-12">
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="w-full object-cover h-[300px] md:h-[400px] lg:h-[500px]"
                />
              </div>
            )}
          </div>

          {/* Post Content */}
          <div className="max-w-3xl mx-auto">
            {/* Render content blocks */}
            {post.contentBlocks && post.contentBlocks.length > 0 ? (
              <BlockRenderer blocks={post.contentBlocks} />
            ) : post.content ? (
              /* Fallback for legacy posts without blocks */
              <div className="prose prose-lg prose-invert max-w-none">
                <MarkdownRenderer content={post.content} />
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>This post has no content yet.</p>
              </div>
            )}

            {/* Discord CTA */}
            <ArticleDiscordCTA />

            {/* Share buttons */}
            <div className="mt-12 flex justify-center">
              <div className="flex gap-4">
                <button
                  onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(window.location.href)}`, '_blank')}
                  className="bg-gray-800 hover:bg-gray-700 text-white w-12 h-12 rounded-full flex items-center justify-center"
                  aria-label="Share on Twitter"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                  </svg>
                </button>
                <button
                  onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')}
                  className="bg-gray-800 hover:bg-gray-700 text-white w-12 h-12 rounded-full flex items-center justify-center"
                  aria-label="Share on Facebook"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                  </svg>
                </button>
                <button
                  onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank')}
                  className="bg-gray-800 hover:bg-gray-700 text-white w-12 h-12 rounded-full flex items-center justify-center"
                  aria-label="Share on LinkedIn"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    showToast('Link copied to clipboard!');
                  }}
                  className="bg-gray-800 hover:bg-gray-700 text-white w-12 h-12 rounded-full flex items-center justify-center"
                  aria-label="Copy link"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Amazon Affiliate Products */}
            {(post.amazonProducts && post.amazonProducts.length > 0) && (
              <AmazonProductGrid
                products={post.amazonProducts.slice(0, 3)}
                title="Buy the Best Deals on Amazon"
              />
            )}

            {/* Add RecommendedProducts component */}
            {recommendedProducts.length > 0 && (
              <RecommendedProductsSection products={recommendedProducts.slice(0, 3)} />
            )}

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <div className="mt-12 border-t border-gray-700 pt-10">
                <h2 className="text-2xl font-bold mb-6">You Might Also Like</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {relatedPosts.map((rp, i) => (
                    <Link
                      key={rp.slug}
                      to={`/blog/${rp.slug}`}
                      className="group flex items-center gap-4 p-4 rounded-xl border border-gray-700/50 overflow-hidden hover:shadow-[0_0_18px_rgba(158,208,75,0.2)] transition-all duration-300 hover:-translate-y-1"
                      style={{
                        background: `linear-gradient(135deg, rgba(158,208,75,0.08) 0%, rgba(158,208,75,0.02) 100%)`,
                      }}
                    >
                      {rp.coverImage && (
                        <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden">
                          <img
                            src={rp.coverImage}
                            alt={rp.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex gap-1 flex-wrap mb-1">
                          {rp.tags.slice(0, 2).map((t) => (
                            <span key={t} className="text-xs bg-gray-700/80 text-gray-300 rounded-full px-2 py-0.5">{t}</span>
                          ))}
                        </div>
                        <h3 className="text-sm font-semibold text-white group-hover:text-[#9ed04b] transition-colors line-clamp-2">
                          {rp.title}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-xs text-[#9ed04b] mt-1 group-hover:gap-2 transition-all">
                          Read more
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BlogPost;