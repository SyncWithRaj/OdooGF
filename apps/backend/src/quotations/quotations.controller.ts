import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { QuotationStatus, Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  AddCommentDto,
  AddUpsellLineDto,
  CreateQuotationDto,
  SubmitQuotationDto,
  UpdateQuotationLinesDto,
} from './dto/quotation.dto';
import { QuotationsService } from './quotations.service';

@ApiTags('CPQ Quotations & Pipeline (Screens 2, 3, 4, 5)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/quotations')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  // ----------------------------------------------------------------------------
  // B1: 5-COLUMN PIPELINE KANBAN (Screen 2)
  // ----------------------------------------------------------------------------
  @Get('pipeline')
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'Get 5-column Kanban pipeline data with counts and stage valuations' })
  @ApiQuery({ name: 'salesRepId', required: false, description: 'Filter by specific sales rep' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Filter by specific customer' })
  @ApiResponse({ status: 200, description: 'Kanban pipeline dataset' })
  async getPipeline(
    @CurrentUser() user: any,
    @Query('salesRepId') salesRepId?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.quotationsService.getPipelineKanban({
      salesRepId,
      customerId,
      currentUserId: user.id,
      currentUserRole: user.role as Role,
    });
  }

  // ----------------------------------------------------------------------------
  // LIST QUOTATIONS
  // ----------------------------------------------------------------------------
  @Get()
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'List all quotations with optional filters' })
  @ApiQuery({ name: 'status', required: false, enum: QuotationStatus })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'salesRepId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'List of quotations' })
  async getAll(
    @Query('status') status?: QuotationStatus,
    @Query('customerId') customerId?: string,
    @Query('salesRepId') salesRepId?: string,
    @Query('search') search?: string,
  ) {
    return this.quotationsService.getAllQuotations({
      status,
      customerId,
      salesRepId,
      search,
    });
  }

  // ----------------------------------------------------------------------------
  // B2: CREATE QUOTATION
  // ----------------------------------------------------------------------------
  @Post()
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER)
  @ApiOperation({ summary: 'Create new quotation in DRAFT state' })
  @ApiResponse({ status: 201, description: 'Quotation created successfully' })
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateQuotationDto,
  ) {
    return this.quotationsService.createQuotation(dto, {
      id: user.id,
      fullName: user.fullName || user.email,
      role: user.role as Role,
    });
  }

  // ----------------------------------------------------------------------------
  // GET QUOTATION BY ID
  // ----------------------------------------------------------------------------
  @Get(':id')
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER, Role.FINANCE, Role.CUSTOMER)
  @ApiOperation({ summary: 'Get quotation details, line items, limit badges, and approval history' })
  @ApiResponse({ status: 200, description: 'Full quotation details' })
  async getById(@Param('id') id: string) {
    return this.quotationsService.getQuotationById(id);
  }

  // ----------------------------------------------------------------------------
  // B2: CPQ LINE EDITOR (Bulk update lines, real-time risk recalculation)
  // ----------------------------------------------------------------------------
  @Put(':id/lines')
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER)
  @ApiOperation({ summary: 'Update quotation lines with live limit badge and margin recalculation' })
  @ApiResponse({ status: 200, description: 'Quotation with recalculated lines and risk level' })
  async updateLines(
    @Param('id') id: string,
    @Body() dto: UpdateQuotationLinesDto,
  ) {
    return this.quotationsService.updateQuotationLines(id, dto);
  }

  // ----------------------------------------------------------------------------
  // B5: AI UPSELL SUGGESTIONS (Screen 4)
  // ----------------------------------------------------------------------------
  @Get(':id/upsell-suggestions')
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'Retrieve ranked AI upsell recommendations based on current quote lines' })
  @ApiResponse({ status: 200, description: 'List of recommended pairings' })
  async getUpsellSuggestions(@Param('id') id: string) {
    return this.quotationsService.getUpsellSuggestions(id);
  }

  // ----------------------------------------------------------------------------
  // B5: 1-CLICK ADD UPSELL ITEM TO QUOTE
  // ----------------------------------------------------------------------------
  @Post(':id/lines/upsell')
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER)
  @ApiOperation({ summary: '1-click add recommended upsell product into quote lines' })
  @ApiResponse({ status: 201, description: 'Quotation updated with upsell line' })
  async addUpsellLine(
    @Param('id') id: string,
    @Body() dto: AddUpsellLineDto,
  ) {
    return this.quotationsService.addUpsellLine(id, dto);
  }

  // ----------------------------------------------------------------------------
  // B3: ZERO-CLICK APPROVAL AUTO-ROUTER / SUBMIT (Screen 3 & 5)
  // ----------------------------------------------------------------------------
  @Post(':id/submit')
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER)
  @ApiOperation({ summary: 'Submit quotation through the zero-click approval router' })
  @ApiResponse({ status: 200, description: 'Submission decision (Auto-approved or routed to queue)' })
  async submit(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: SubmitQuotationDto,
  ) {
    return this.quotationsService.submitQuotation(
      id,
      {
        id: user.id,
        fullName: user.fullName || user.email,
        role: user.role as Role,
      },
      dto,
    );
  }

  @Post(':id/submit-approval')
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER)
  @ApiOperation({ summary: 'Submit quotation through the zero-click approval router (alias of /submit)' })
  @ApiResponse({ status: 200, description: 'Submission decision' })
  async submitApproval(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: SubmitQuotationDto,
  ) {
    return this.quotationsService.submitQuotation(
      id,
      {
        id: user.id,
        fullName: user.fullName || user.email,
        role: user.role as Role,
      },
      dto,
    );
  }

  // ----------------------------------------------------------------------------
  // COMMENTS / SALES NOTES
  // ----------------------------------------------------------------------------
  @Get(':id/comments')
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'Get all comments for a quotation' })
  @ApiResponse({ status: 200, description: 'List of quotation comments' })
  async getComments(@Param('id') id: string) {
    return this.quotationsService.getComments(id);
  }

  @Post(':id/comments')
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'Add a comment / negotiation note to a quotation' })
  @ApiResponse({ status: 201, description: 'Comment added' })
  async addComment(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: AddCommentDto,
  ) {
    return this.quotationsService.addComment(
      id,
      {
        id: user.id,
        fullName: user.fullName || user.email,
        role: user.role as Role,
      },
      dto,
    );
  }
}
