import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChatsService } from './chats.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';

@ApiTags('Chats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new chat' })
  create(@CurrentUser() user: any, @Body() dto: CreateChatDto) {
    return this.chatsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "List current user's chats" })
  @ApiQuery({ name: 'orgId', required: true, type: String })
  findAll(
    @CurrentUser() user: any,
    @Query('orgId', ParseUUIDPipe) orgId: string,
  ) {
    return this.chatsService.findUserChats(user.id, orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get chat by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.chatsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update chat' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateChatDto,
  ) {
    return this.chatsService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete chat' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.chatsService.remove(id, user.id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add a member to the chat' })
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: any,
  ) {
    return this.chatsService.addMember(id, userId, user.id);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove a member from the chat' })
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: any,
  ) {
    return this.chatsService.removeMember(id, userId, user.id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get chat members' })
  getMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.chatsService.getMembers(id);
  }
}
