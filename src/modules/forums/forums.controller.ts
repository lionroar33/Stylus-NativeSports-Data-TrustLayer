import { Controller, Get, Post, Put, Delete, Body, Param, Query, Render } from '@nestjs/common';
import { ForumsService } from './forums.service';
import { CreateForumDto, CreatePostDto, UpdatePostDto, ReportPostDto, ForumCategory } from './dto/forum.dto';

/**
 * Forums Controller - UI & API Routes
 * Module 5: Community Discussion Space
 */
@Controller('forums')
export class ForumsController {
  constructor(private readonly forumsService: ForumsService) {}

  // ============================================
  // UI Routes
  // ============================================

  @Get()
  @Render('forums/index')
  index() {
    const forums = this.forumsService.getAllForums();
    return {
      title: 'Forums',
      layout: 'layouts/main',
      isForums: true,
      pageTitle: 'Community Forums',
      user: { name: 'John Doe', initials: 'JD' },
      forums: forums.map(f => ({
        ...f,
        stats: this.forumsService.getForumStats(f.id),
      })),
    };
  }

  // ============================================
  // API Routes - Forums
  // ============================================

  @Get('api')
  getAllForums(@Query('category') category?: ForumCategory, @Query('sportId') sportId?: string) {
    const forums = this.forumsService.getAllForums({ category, sportId });
    return {
      success: true,
      data: forums.map(f => ({
        ...f,
        stats: this.forumsService.getForumStats(f.id),
      })),
    };
  }

  @Post('api')
  createForum(@Body() dto: CreateForumDto) {
    const userId = 'current-user'; // Should come from auth
    const forum = this.forumsService.createForum(dto, userId);
    return { success: true, data: forum };
  }

  @Get('api/:id')
  getForum(@Param('id') forumId: string) {
    const forum = this.forumsService.getForum(forumId);
    const stats = this.forumsService.getForumStats(forumId);
    return { success: true, data: { ...forum, stats } };
  }

  @Delete('api/:id')
  deleteForum(@Param('id') forumId: string) {
    const userId = 'current-user'; // Should come from auth
    this.forumsService.deleteForum(forumId, userId);
    return { success: true, message: 'Forum deleted' };
  }

  // ============================================
  // API Routes - Posts
  // ============================================

  @Get('api/:forumId/posts')
  getForumPosts(
    @Param('forumId') forumId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20
  ) {
    const result = this.forumsService.getForumPosts(forumId, +page, +limit);
    return {
      success: true,
      data: result.posts,
      pagination: {
        page: +page,
        limit: +limit,
        total: result.total,
        pages: Math.ceil(result.total / +limit),
      },
    };
  }

  @Post('api/:forumId/posts')
  createPost(@Param('forumId') forumId: string, @Body() dto: Omit<CreatePostDto, 'forumId'>) {
    const userId = 'current-user'; // Should come from auth
    const post = this.forumsService.createPost({ ...dto, forumId }, userId);
    return { success: true, data: post };
  }

  @Get('api/posts/:postId')
  getPost(@Param('postId') postId: string) {
    const post = this.forumsService.getPost(postId);
    const replies = this.forumsService.getPostReplies(postId);
    return { success: true, data: { ...post, replies } };
  }

  @Put('api/posts/:postId')
  updatePost(@Param('postId') postId: string, @Body() dto: UpdatePostDto) {
    const userId = 'current-user'; // Should come from auth
    const post = this.forumsService.updatePost(postId, dto, userId);
    return { success: true, data: post };
  }

  @Delete('api/posts/:postId')
  deletePost(@Param('postId') postId: string) {
    const userId = 'current-user'; // Should come from auth
    this.forumsService.deletePost(postId, userId);
    return { success: true, message: 'Post deleted' };
  }

  @Get('api/posts/:postId/replies')
  getPostReplies(@Param('postId') postId: string) {
    const replies = this.forumsService.getPostReplies(postId);
    return { success: true, data: replies };
  }

  // ============================================
  // API Routes - Likes
  // ============================================

  @Post('api/posts/:postId/like')
  likePost(@Param('postId') postId: string) {
    const userId = 'current-user'; // Should come from auth
    const post = this.forumsService.likePost(postId, userId);
    return { success: true, data: { likesCount: post.likesCount } };
  }

  @Delete('api/posts/:postId/like')
  unlikePost(@Param('postId') postId: string) {
    const userId = 'current-user'; // Should come from auth
    const post = this.forumsService.unlikePost(postId, userId);
    return { success: true, data: { likesCount: post.likesCount } };
  }

  // ============================================
  // API Routes - Reports
  // ============================================

  @Post('api/posts/:postId/report')
  reportPost(@Param('postId') postId: string, @Body() dto: { reason: string }) {
    const userId = 'current-user'; // Should come from auth
    const report = this.forumsService.reportPost({ postId, reason: dto.reason }, userId);
    return { success: true, data: report };
  }

  @Get('api/moderation/flagged')
  getFlaggedPosts() {
    const posts = this.forumsService.getFlaggedPosts();
    return { success: true, data: posts };
  }
}
