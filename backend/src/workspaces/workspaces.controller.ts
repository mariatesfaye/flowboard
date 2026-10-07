import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../auth/types';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.workspaces.listForUser(user.id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateWorkspaceDto) {
    return this.workspaces.create(user.id, dto);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.workspaces.getById(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspaces.update(id, user.id, dto);
  }

  @Get(':id/members')
  members(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.workspaces.listMembers(id, user.id);
  }

  @Post(':id/members')
  addMember(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: AddMemberDto,
  ) {
    return this.workspaces.addMember(id, user.id, dto);
  }

  @Patch(':id/members/:memberId')
  updateMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.workspaces.updateMember(id, memberId, user.id, dto);
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workspaces.removeMember(id, memberId, user.id);
  }

  @Get(':id/activity')
  activity(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.workspaces.listActivity(id, user.id);
  }

  @Get(':id/labels')
  labels(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.workspaces.listLabels(id, user.id);
  }

  @Post(':id/labels')
  createLabel(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateLabelDto,
  ) {
    return this.workspaces.createLabel(id, user.id, dto);
  }
}
