use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer}};

declare_id!("Dy2vhvNVmuRHuvAFQfGFTnwGAU7QXaDgtVq8KycczLbx");

#[program]
pub mod transfer_closure {
    use super::*;

    pub fn transfer_close(ctx: Context<TransferCtx>) -> Result<()> {
        let destination = &ctx.accounts.to_ata;
        let sender = &ctx.accounts.from_ata;
        let amount = sender.amount;
        let authority = &ctx.accounts.from;
        let token_program = &ctx.accounts.token_program;

        let cpi_accounts = Transfer {
            from: sender.to_account_info().clone(),
            to: destination.to_account_info().clone(),
            authority: authority.to_account_info().clone(),
        };

        let cpi_program = token_program.to_account_info();

        token::transfer(CpiContext::new(cpi_program.clone(), cpi_accounts), amount)?;

        let close_cpi_accounts = CloseAccount {
            account: sender.to_account_info().clone(),
            destination: authority.to_account_info().clone(),
            authority: authority.to_account_info().clone(),
        };

        token::close_account(CpiContext::new(cpi_program, close_cpi_accounts))?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct TransferCtx<'info> {
    #[account(mut)]
    pub from: Signer<'info>,

    /// CHECK: rent reclaim acc
    #[account(mut)]
    pub to: UncheckedAccount<'info>,
    
    pub mint: Account<'info, Mint>,

    #[account(mut, associated_token::mint = mint, associated_token::authority = from)]
    pub from_ata: Account<'info, TokenAccount>,

    #[account(mut, associated_token::mint = mint, associated_token::authority = to)]
    pub to_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program : Program<'info, AssociatedToken>
}
