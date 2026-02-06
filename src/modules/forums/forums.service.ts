/**
 * Forums Service
 * Phase 5: Community Discussion Space
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateForumDto,
  CreatePostDto,
  UpdatePostDto,
  ReportPostDto,
  ForumCategory,
} from './dto/forum.dto';

export interface Forum {
  id: string;
  title: string;
  description?: string;
  category: ForumCategory;
  sportId?: string;
  tournamentId?: string;
  creatorId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Post {
  id: string;
  forumId: string;
  userId: string;
  content: string;
  parentPostId?: string;
  likesCount: number;
  likedBy: Set<string>;
  isFlagged: boolean;
  flagReasons: string[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostReport {
  id: string;
  postId: string;
  reporterId: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  createdAt: Date;
}

@Injectable()
export class ForumsService {
  private forums: Map<string, Forum> = new Map();
  private posts: Map<string, Post> = new Map();
  private reports: Map<string, PostReport> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    // Initialize with sample forums
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    const sampleForums: Forum[] = [
      {
        id: uuidv4(),
        title: 'Cricket Discussion',
        description: 'General cricket talk, match discussions, and player analysis',
        category: ForumCategory.CRICKET,
        creatorId: 'system',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        title: 'Football Corner',
        description: 'All things football - leagues, teams, and matches',
        category: ForumCategory.FOOTBALL,
        creatorId: 'system',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        title: 'General Sports',
        description: 'Discuss any sport, fitness tips, and more',
        category: ForumCategory.GENERAL,
        creatorId: 'system',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    sampleForums.forEach(forum => this.forums.set(forum.id, forum));
  }

  // ============================================
  // Forum CRUD
  // ============================================

  createForum(dto: CreateForumDto, userId: string): Forum {
    const forum: Forum = {
      id: uuidv4(),
      title: dto.title,
      description: dto.description,
      category: dto.category,
      sportId: dto.sportId,
      tournamentId: dto.tournamentId,
      creatorId: userId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.forums.set(forum.id, forum);
    this.eventEmitter.emit('forum.created', { forum });
    return forum;
  }

  getForum(forumId: string): Forum {
    const forum = this.forums.get(forumId);
    if (!forum || !forum.isActive) {
      throw new NotFoundException(`Forum ${forumId} not found`);
    }
    return forum;
  }

  getAllForums(filters?: { category?: ForumCategory; sportId?: string }): Forum[] {
    let forums = Array.from(this.forums.values()).filter(f => f.isActive);

    if (filters?.category) {
      forums = forums.filter(f => f.category === filters.category);
    }

    if (filters?.sportId) {
      forums = forums.filter(f => f.sportId === filters.sportId);
    }

    return forums.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  deleteForum(forumId: string, userId: string): void {
    const forum = this.getForum(forumId);

    if (forum.creatorId !== userId) {
      throw new BadRequestException('Only forum creator can delete');
    }

    forum.isActive = false;
    forum.updatedAt = new Date();
  }

  // ============================================
  // Post CRUD
  // ============================================

  createPost(dto: CreatePostDto, userId: string): Post {
    // Validate forum exists
    this.getForum(dto.forumId);

    // Validate parent post if replying
    if (dto.parentPostId) {
      const parentPost = this.posts.get(dto.parentPostId);
      if (!parentPost || parentPost.isDeleted) {
        throw new NotFoundException('Parent post not found');
      }
    }

    const post: Post = {
      id: uuidv4(),
      forumId: dto.forumId,
      userId,
      content: dto.content,
      parentPostId: dto.parentPostId,
      likesCount: 0,
      likedBy: new Set(),
      isFlagged: false,
      flagReasons: [],
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.posts.set(post.id, post);

    // Update forum activity
    const forum = this.forums.get(dto.forumId);
    if (forum) {
      forum.updatedAt = new Date();
    }

    this.eventEmitter.emit('post.created', { post, forumId: dto.forumId });

    // Notify parent post author if reply
    if (dto.parentPostId) {
      const parentPost = this.posts.get(dto.parentPostId);
      if (parentPost && parentPost.userId !== userId) {
        this.eventEmitter.emit('notification.send', {
          userId: parentPost.userId,
          type: 'reply',
          message: 'Someone replied to your post',
          data: { postId: post.id, forumId: dto.forumId },
        });
      }
    }

    return post;
  }

  getPost(postId: string): Post {
    const post = this.posts.get(postId);
    if (!post || post.isDeleted) {
      throw new NotFoundException(`Post ${postId} not found`);
    }
    return post;
  }

  getForumPosts(forumId: string, page = 1, limit = 20): { posts: Post[]; total: number } {
    this.getForum(forumId); // Validate forum exists

    const allPosts = Array.from(this.posts.values())
      .filter(p => p.forumId === forumId && !p.isDeleted && !p.parentPostId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = allPosts.length;
    const posts = allPosts.slice((page - 1) * limit, page * limit);

    return { posts, total };
  }

  getPostReplies(postId: string): Post[] {
    return Array.from(this.posts.values())
      .filter(p => p.parentPostId === postId && !p.isDeleted)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  updatePost(postId: string, dto: UpdatePostDto, userId: string): Post {
    const post = this.getPost(postId);

    if (post.userId !== userId) {
      throw new BadRequestException('Only post author can edit');
    }

    post.content = dto.content;
    post.updatedAt = new Date();

    return post;
  }

  deletePost(postId: string, userId: string): void {
    const post = this.getPost(postId);

    if (post.userId !== userId) {
      throw new BadRequestException('Only post author can delete');
    }

    post.isDeleted = true;
    post.updatedAt = new Date();
  }

  // ============================================
  // Likes
  // ============================================

  likePost(postId: string, userId: string): Post {
    const post = this.getPost(postId);

    if (post.likedBy.has(userId)) {
      throw new BadRequestException('Already liked this post');
    }

    post.likedBy.add(userId);
    post.likesCount++;

    // Notify post author
    if (post.userId !== userId) {
      this.eventEmitter.emit('notification.send', {
        userId: post.userId,
        type: 'like',
        message: 'Someone liked your post',
        data: { postId },
      });
    }

    return post;
  }

  unlikePost(postId: string, userId: string): Post {
    const post = this.getPost(postId);

    if (!post.likedBy.has(userId)) {
      throw new BadRequestException('Not liked this post');
    }

    post.likedBy.delete(userId);
    post.likesCount--;

    return post;
  }

  // ============================================
  // Reporting & Moderation
  // ============================================

  reportPost(dto: ReportPostDto, reporterId: string): PostReport {
    const post = this.getPost(dto.postId);

    const report: PostReport = {
      id: uuidv4(),
      postId: dto.postId,
      reporterId,
      reason: dto.reason,
      status: 'pending',
      createdAt: new Date(),
    };

    this.reports.set(report.id, report);

    // Flag post after multiple reports
    const postReports = Array.from(this.reports.values())
      .filter(r => r.postId === dto.postId && r.status === 'pending');

    if (postReports.length >= 3) {
      post.isFlagged = true;
      post.flagReasons = postReports.map(r => r.reason);
    }

    this.eventEmitter.emit('post.reported', { report, post });

    return report;
  }

  getFlaggedPosts(): Post[] {
    return Array.from(this.posts.values())
      .filter(p => p.isFlagged && !p.isDeleted);
  }

  reviewReport(reportId: string, action: 'approve' | 'dismiss', moderatorId: string): void {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    report.status = action === 'approve' ? 'reviewed' : 'dismissed';

    if (action === 'approve') {
      const post = this.posts.get(report.postId);
      if (post) {
        post.isDeleted = true;
      }
    }
  }

  // ============================================
  // Statistics
  // ============================================

  getForumStats(forumId: string): { postCount: number; memberCount: number; lastActivity: Date | null } {
    const posts = Array.from(this.posts.values())
      .filter(p => p.forumId === forumId && !p.isDeleted);

    const uniqueUsers = new Set(posts.map(p => p.userId));
    const lastPost = posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    return {
      postCount: posts.length,
      memberCount: uniqueUsers.size,
      lastActivity: lastPost?.createdAt || null,
    };
  }
}
