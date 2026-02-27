/**
 * Real community testimonials from 2020–2021 GPU shortage era.
 * Sourced from HardForum and similar tech communities where users describe
 * getting GPUs/consoles with Discord stock alerts. CtrlAltStock-specific
 * mentions were not found in search; these are from the broader GPU stock
 * alert community (StockDrops, Discord channels) which CtrlAltStock is part of.
 */

export interface CommunityTestimonial {
  quote: string;
  username: string;
  sourceUrl: string;
  platform?: string;
}

export const communityTestimonials: CommunityTestimonial[] = [
  {
    quote:
      'A lot of guys got them off of StockDrops Discord notifications. I actually picked up a 3070 MSI Trio after I posted.',
    username: 'Jimmmy',
    sourceUrl:
      'https://hardforum.com/threads/how-to-acquire-a-new-generation-card-step-by-step-guide.2005468/',
    platform: 'HardForum',
  },
  {
    quote:
      'Today I basically randomly stumbled onto a new GPU at BB. 4th time, EVGA 3090 EC3 Ultra for shits and grins, I scored — had to pinch myself thinking maybe I was in a bad dream or something.',
    username: 'noko',
    sourceUrl:
      'https://hardforum.com/threads/how-to-acquire-a-new-generation-card-step-by-step-guide.2005468/',
    platform: 'HardForum',
  },
  {
    quote:
      'First attempt, did not score a CPU, but did score a Strix RTX 3090. 3rd attempt I bought an EVGA RTX 3080 FTW3 Ultra via voucher. MicroCenter gets stock regularly.',
    username: 'Supercharged_Z06',
    sourceUrl:
      'https://hardforum.com/threads/how-to-acquire-a-new-generation-card-step-by-step-guide.2005468/',
    platform: 'HardForum',
  },
  {
    quote:
      'I have had success following it so far — today alone I have bought an MSI 6900XT from Newegg AND an AMD 5600X from Amazon. Discord will get you something if you are open minded.',
    username: 'Jimmmy',
    sourceUrl:
      'https://hardforum.com/threads/how-to-acquire-a-new-generation-card-step-by-step-guide.2005468/',
    platform: 'HardForum',
  },
  {
    quote:
      'They did have A LOT of the MSI Gaming X Trio and I did pick one of those up. Went around 10am and there was a small line at the VC section.',
    username: 'Sky15',
    sourceUrl:
      'https://hardforum.com/threads/how-to-acquire-a-new-generation-card-step-by-step-guide.2005468/',
    platform: 'HardForum',
  },
  {
    quote:
      'I have gotten a card on 2 out of 3 drops — a 6900xt both times. I have also picked up an EVGA 3080 FTW3 just walking into MicroCenter. Discord is your new best friend for acquiring items.',
    username: 'Jimmmy',
    sourceUrl:
      'https://hardforum.com/threads/how-to-acquire-a-new-generation-card-step-by-step-guide.2005468/',
    platform: 'HardForum',
  },
];
