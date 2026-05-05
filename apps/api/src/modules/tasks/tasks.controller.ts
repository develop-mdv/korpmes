import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TaskStatus } from '@corp/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  CreateChecklistItemDto,
  UpdateChecklistItemDto,
} from './dto/checklist.dto';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(user.id, dto);
  }

  @Get()
  async list(
    @CurrentUser() user: { id: string },
    @Query('orgId') orgId: string,
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('chatId') chatId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tasksService.findByOrg(
      orgId,
      user.id,
      { status, priority, assignedTo, chatId },
      { page: page ? parseInt(page, 10) : undefined, limit: limit ? parseInt(limit, 10) : undefined },
    );
  }

  @Get('my')
  async myTasks(
    @CurrentUser() user: { id: string },
    @Query('orgId') orgId: string,
  ) {
    const [assigned, created, watching] = await Promise.all([
      this.tasksService.findByUser(user.id, orgId, 'assigned'),
      this.tasksService.findByUser(user.id, orgId, 'created'),
      this.tasksService.findByUser(user.id, orgId, 'watching'),
    ]);
    return { assigned, created, watching };
  }

  @Get(':id')
  async getTask(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.tasksService.findById(id, user.id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, user.id, dto);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.tasksService.remove(id, user.id);
    return { deleted: true };
  }

  @Patch(':id/assign')
  async assign(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() body: { assignedTo: string | null },
  ) {
    return this.tasksService.assign(id, body.assignedTo, user.id);
  }

  @Post(':id/comments')
  async addComment(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() body: { content: string },
  ) {
    return this.tasksService.addComment(id, user.id, body.content);
  }

  @Get(':id/comments')
  async getComments(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.tasksService.getComments(id, user.id);
  }

  @Get(':id/checklist')
  async getChecklist(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.tasksService.getChecklist(id, user.id);
  }

  @Post(':id/checklist')
  async addChecklistItem(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateChecklistItemDto,
  ) {
    return this.tasksService.addChecklistItem(id, user.id, dto);
  }

  @Patch('checklist/:itemId')
  async updateChecklistItem(
    @Param('itemId') itemId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateChecklistItemDto,
  ) {
    return this.tasksService.updateChecklistItem(itemId, user.id, dto);
  }

  @Delete('checklist/:itemId')
  async removeChecklistItem(
    @Param('itemId') itemId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.tasksService.removeChecklistItem(itemId, user.id);
    return { deleted: true };
  }

  @Get(':id/files')
  async getAttachments(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.tasksService.getAttachments(id, user.id);
  }

  @Post(':id/files')
  async attachFile(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() body: { fileId: string },
  ) {
    return this.tasksService.attachFile(id, body.fileId, user.id);
  }

  @Delete(':id/files/:fileId')
  async detachFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.tasksService.detachFile(id, fileId, user.id);
    return { detached: true };
  }
}
