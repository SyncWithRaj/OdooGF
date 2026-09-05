import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AcceptQuoteDto, CounterProposalDto, ShortageActionDto } from './dto/portal.dto';
import { PortalService } from './portal.service';

@ApiTags('Customer Self-Service Portal & Negotiation Loop (Screen 11 & Red-Dashed Loop, B8)')
@Controller('api/portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get('quote/:token')
  @ApiOperation({ summary: 'Customer view of quotation (Margin and costs securely masked)' })
  @ApiResponse({ status: 200, description: 'Customer quotation view' })
  async getQuote(@Param('token') token: string) {
    return this.portalService.getQuoteByToken(token);
  }

  @Post('quote/:token/accept')
  @ApiOperation({ summary: 'Customer 1-click acceptance of quotation terms' })
  @ApiResponse({ status: 200, description: 'Quotation confirmed' })
  async acceptQuote(
    @Param('token') token: string,
    @Body() dto: AcceptQuoteDto,
  ) {
    return this.portalService.acceptQuote(token, dto);
  }

  @Post('quote/:token/confirm')
  @ApiOperation({ summary: 'Customer 1-click confirmation (alias of accept)' })
  @ApiResponse({ status: 200, description: 'Quotation confirmed' })
  async confirmQuote(
    @Param('token') token: string,
    @Body() dto: AcceptQuoteDto,
  ) {
    return this.portalService.acceptQuote(token, dto);
  }

  @Post('quote/:token/comment')
  @ApiOperation({ summary: 'Customer posts a line or general negotiation comment via portal' })
  @ApiResponse({ status: 201, description: 'Comment recorded' })
  async addComment(
    @Param('token') token: string,
    @Body() dto: { message: string },
  ) {
    return this.portalService.addComment(token, dto.message);
  }

  @Post('quote/:token/counter')
  @ApiOperation({
    summary:
      'Customer counter-proposal (Red-Dashed Loop: triggers re-approval if discount exceeds ceiling)',
  })
  @ApiResponse({ status: 200, description: 'Counter proposal recorded / re-approval triggered' })
  async counterProposal(
    @Param('token') token: string,
    @Body() dto: CounterProposalDto,
  ) {
    return this.portalService.counterProposal(token, dto);
  }

  @Post('quote/:token/shortage-action')
  @ApiOperation({
    summary:
      'Engine 5: Customer decision on unfulfillable shortage offer (ACCEPT partial quantity X or REJECT/WAIT)',
  })
  @ApiResponse({ status: 200, description: 'Customer response to shortage proposal recorded' })
  async respondToShortage(
    @Param('token') token: string,
    @Body() dto: ShortageActionDto,
  ) {
    return this.portalService.respondToShortageProposal(token, dto.action);
  }
}

