/**
 * VIRTUAL FILESYSTEM
 * -------------------
 * This is the entire world the player explores. It is plain data — the
 * engine (engine/vfs.js) never knows what a "vault" or "readme.txt" is,
 * it just walks this tree.
 *
 * FOLDER NODE:
 *   { type: 'folder', name, requiresKey?: 'KEY_X', children: [...] }
 *     - requiresKey omitted or null  -> always enterable
 *     - requiresKey: 'KEY_X'         -> only enterable once the player
 *                                        has unlocked KEY_X (see keys.js)
 *
 * FILE NODE:
 *   { type: 'file', name, content: string }
 *     - `content` is what `cat` prints.
 *   Large / grep-or-head-gated file:
 *   { type: 'file', name, large: true, content: '<stub shown by cat>',
 *     fullContent: '<the real multi-line text searched by grep/head>' }
 *
 * TO ADD A NEW BRANCH: just add a folder/file object anywhere in this
 * tree and give it a requiresKey if it should stay locked. Nothing else
 * in the codebase needs to change. See keys.js for the code -> key id
 * map, and levels.js for how a key id maps to a level/points/hints.
 *
 * KEY MAP (for reference while editing — kept in sync with keys.js):
 *   KEY_1  7F29        -> restricted_alpha, restricted_beta, restricted_gamma
 *   KEY_2  B3D9         -> alpha/vault
 *   KEY_3  1907         -> beta/logs
 *   KEY_4  K4-2091       -> restricted_delta, archive
 *   KEY_5  D5-77A1       -> delta/backup
 *   KEY_6  AR-6602       -> archive/logs
 *   KEY_7  N3T-7734      -> network
 *   KEY_8  PR-5567       -> delta/backup/personnel
 *   KEY_9  DL-2205       -> network/deep_logs (+ unlocks grep)
 *   KEY_10 FR-9182       -> network/deep_logs/forensics
 *   KEY_11 MF-3300       -> mainframe (+ unlocks head)
 *   KEY_12 C0R3-4415     -> mainframe/core
 *   KEY_13 VX-8841       -> mainframe/core/vault_alpha, vault_beta
 *   KEY_14 ID-1907       -> vault_alpha/identity
 *   KEY_15 CO-3391       -> vault_beta/coordinates
 *   KEY_16 KA07-3391     -> final_uplink
 *   KEY_17 CA-5510       -> final_uplink/core_access
 *   KEY_18 CH-8850       -> final_uplink/core_access/black_box
 *   KEY_19 TRUTH-0001    -> final_uplink/the_truth
 *   KEY_20 END-0000      -> (no folder — completes the game)
 */

const filesystem = {
  type: 'folder',
  name: '/',
  requiresKey: null,
  children: [
    {
      type: 'file',
      name: 'readme.txt',
      content:
`SYSTEM RECOVERY LOG - AUTO GENERATED

You are looking at this because your team pulled a dead drive out of a
seized server rack three weeks ago. Nobody could get past the login
screen. Then last night, without anyone touching it, the machine posted
this file to the recovery console on its own.

If you're reading this, the shell is open. Somebody wanted it to be.

My name doesn't matter yet. What matters is that everything on this
machine is real, and most of it was never supposed to survive a wipe.
I built in a few dead-man switches before I disappeared. You found one.

This terminal only understands a few things:
  ls            - list what's in the current directory
  cd <dir>      - move into a directory ( cd .. goes back up )
  pwd           - print where you are
  cat <file>    - read a file
  clear         - clear the screen
  help          - list what you're currently able to do
  hint          - if you're stuck, ask for a nudge
  unlock <code> - feed a code/key back into the system

Most of this filesystem is locked. You'll see folders marked [LOCKED].
You can't force them open - you need a code. Codes are hidden in files,
or you'll have to work one out from what you read. Feeding the right
code to 'unlock' can open more than one door at once, so don't assume
there's only one path forward.

I didn't leave a map. I left a trail. Start by checking what else is
sitting next to this file.

  - a ghost, for now`
    },
    {
      type: 'file',
      name: 'note.txt',
      content:
`sticky note, digitized by OCR on intake:

"remembered the temp door code by yelling it at the badge reader
every morning for two years. never wrote it down. except here,
apparently, past me. good job.

  7F29

don't lose this one."`
    },
    {
      type: 'folder',
      name: 'restricted_alpha',
      requiresKey: 'KEY_1',
      children: [
        {
          type: 'file',
          name: 'access.txt',
          content:
`INTAKE LOG - ALPHA WING

Whoever's reading this got past the first door. Good. This wing was
just overflow storage, nothing precious - the real work is deeper in.

There's a second code stapled (digitally speaking) to an old vault
manifest in here. Keep it dark though — B3D9`
        },
        {
          type: 'folder',
          name: 'vault',
          requiresKey: 'KEY_2',
          children: [
            {
              type: 'file',
              name: 'manifest.txt',
              content:
`VAULT MANIFEST - ALPHA/001

Contents: nothing you need. This vault was a decoy for anyone who
broke in through the front. The real record-keeping happens in the
beta and gamma wings.

If you've made it this far you already have decent instincts. Keep
going. The next lock isn't a code sitting in a file — you'll have to
work it out.`
            }
          ]
        }
      ]
    },
    {
      type: 'folder',
      name: 'restricted_beta',
      requiresKey: 'KEY_1',
      children: [
        {
          type: 'file',
          name: 'old_note.txt',
          content:
`Found this taped inside a drawer, transcribed as-is:

"He always used the same number for everything that mattered.
His first project went live in 2019.
His favorite rack in the server room was always numbered 07.
He used to joke that if you ever needed his code and he wasn't
around, just mash the year and the rack together and you'd have it."

(there's no code written down anywhere else nearby - you'll have to
build this one yourself)`
        },
        {
          type: 'folder',
          name: 'logs',
          requiresKey: 'KEY_3',
          children: [
            {
              type: 'file',
              name: 'entry_881.txt',
              content:
`LOG 881

Beta wing is clean now. Everything that mattered got moved to gamma
before the audit. If gamma opens something else up, cross-check
whatever's inside against a shift schedule - nothing in this place
was left in only one spot. I was careful like that.`
            }
          ]
        }
      ]
    },
    {
      type: 'folder',
      name: 'restricted_gamma',
      requiresKey: 'KEY_1',
      children: [
        {
          type: 'file',
          name: 'manifest.txt',
          content:
`GAMMA MANIFEST

Three items moved here from beta, tagged with a batch code.
Batch prefix: K4-
The rest of the batch code is on the shift schedule, if it's still
sitting where I left it.`
        },
        {
          type: 'file',
          name: 'schedule.txt',
          content:
`SHIFT SCHEDULE - LAST WEEK BEFORE SHUTDOWN

Mon   - J.O.   - badge 2091
Tue   - J.O.   - badge 2091
Wed   - (nobody logged in)
Thu   - J.O.   - badge 2091
Fri   - system flagged for external audit, all access revoked

Same badge number every working day. Consistent guy.`
        }
      ]
    },
    {
      type: 'folder',
      name: 'restricted_delta',
      requiresKey: 'KEY_4',
      children: [
        {
          type: 'file',
          name: 'intro.txt',
          content:
`DELTA WING

This is where things stop being tidy. Delta held the stuff that
wasn't supposed to be catalogued anywhere official.

There's a backup drive mounted below. It has its own lock — the code
for it isn't hidden, it's just badly disguised. Look at every
filename in this directory again once you think you're out of
files. You aren't.`
        },
        {
          type: 'file',
          name: '.cfg_D5-77A1',
          content:
`if you're reading this by cat-ing a dotfile, you're paying attention.
the filename IS the code. drop the leading dot and the underscore
before it — "cfg_" is just a label, "D5-77A1" is what you need.`
        },
        {
          type: 'folder',
          name: 'backup',
          requiresKey: 'KEY_5',
          children: [
            {
              type: 'file',
              name: 'status.txt',
              content:
`BACKUP DRIVE STATUS: mounted, read-only

Personnel records are in here somewhere, but they're access-flagged.
The unlock code for the flagged record isn't stored on this drive —
it's written on a procedure note over in the archive wing. I split
things up on purpose.`
            },
            {
              type: 'folder',
              name: 'personnel',
              requiresKey: 'KEY_8',
              children: [
                {
                  type: 'file',
                  name: 'roster.txt',
                  content:
`PERSONNEL ROSTER (partial)

K. ASHWORTH - Lead Systems Architect - STATUS: terminated (voluntary)
J. OKONKWO  - Infrastructure - STATUS: active
R. VANCE    - Compliance Director - STATUS: active
D. PRIYA    - unlisted role - STATUS: unknown

Ashworth's exit paperwork is missing. Everyone else's isn't.`
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: 'folder',
      name: 'archive',
      requiresKey: 'KEY_4',
      children: [
        {
          type: 'file',
          name: 'flag_procedure.txt',
          content:
`ACCESS FLAG PROCEDURE

To clear a personnel flag, feed the record's assigned unlock code
into the system. There's exactly one flagged personnel record on
this drive right now.

  PR-5567

That's the whole code — it's for the record sitting in delta/backup.`
        },
        {
          type: 'file',
          name: 'internal_review.txt',
          content:
`INTERNAL REVIEW NOTE

The full archive access logs are locked behind a review code, mostly
to keep casual browsers out. It's not subtle if you're actually
looking for it:

  AR-6602`
        },
        {
          type: 'folder',
          name: 'logs',
          requiresKey: 'KEY_6',
          children: [
            {
              type: 'file',
              name: 'access_log.txt',
              content:
`ARCHIVE ACCESS LOG

...routine entries stripped...

Last external connection before shutdown came from a subnet outside
this building entirely, tunnelling in through infrastructure tagged
"network" wing. That wing isn't nested under anything you've opened -
it was mounted separately, at the top level. Its access code was
recovered from the same connection record:

  N3T-7734`
            }
          ]
        }
      ]
    },
    {
      type: 'folder',
      name: 'network',
      requiresKey: 'KEY_7',
      children: [
        {
          type: 'file',
          name: 'readme.txt',
          content:
`NETWORK WING

This is the part of the system that talked to the outside world.
There's a full connection log a level down, but it's enormous -
thousands of lines. Reading it with 'cat' will just dump garbage at
you.

Somewhere in this system there's a smaller, sharper tool for
searching through something this size instead of reading it end to
end. Check the other file sitting next to this one.`
        },
        {
          type: 'file',
          name: 'deep_logs_access.txt',
          content:
`DEEP LOGS - ACCESS NOTE

Half-remembered search utility, noted here in case I forget I ever
had it: 'grep'. Searches a file's contents for a pattern instead of
printing the whole thing, e.g.:

  grep "ACCESS" filename.txt

Entering the code below should both open the deep logs folder and
make that tool available in this shell, if it isn't already:

  DL-2205`
        },
        {
          type: 'folder',
          name: 'deep_logs',
          requiresKey: 'KEY_9',
          children: [
            {
              type: 'file',
              name: 'connection_log.txt',
              large: true,
              content:
`[FILE TOO LARGE TO DISPLAY WITH cat]
This file has thousands of lines. Use grep to search it, e.g.:
  grep "ACCESS" connection_log.txt`,
              fullContent: Array.from({ length: 40 }, (_, i) => {
                const n = String(i + 1).padStart(4, '0');
                if (i === 22) {
                  return `${n} 03:14:07 ACCESS GRANTED external_node=K.ASHWORTH-remote key_fragment=FR-9182 status=escalation_logged`;
                }
                if (i === 30) {
                  return `${n} 03:15:44 ACCESS GRANTED external_node=K.ASHWORTH-remote note="pulling forensics dump before they lock me out"`;
                }
                return `${n} 0${2 + (i % 3)}:${String((i * 7) % 60).padStart(2, '0')}:${String((i * 13) % 60).padStart(2, '0')} heartbeat ok subsystem=routine-${i % 5} status=nominal`;
              }).join('\n')
            },
            {
              type: 'folder',
              name: 'forensics',
              requiresKey: 'KEY_10',
              children: [
                {
                  type: 'file',
                  name: 'dump_note.txt',
                  content:
`FORENSICS DUMP - RECOVERED

Whatever Ashworth pulled before getting locked out is sitting in
this folder. Check the other file here for what it led to.`
                },
                {
                  type: 'file',
                  name: 'report.txt',
                  content:
`FORENSICS REPORT

The trail leads to a mainframe subsystem that was walled off from
the rest of this drive. Its access code was recovered intact:

  MF-3300

Once you're in, there's a config file with a long boot log. You only
need the very first line of it - 'cat' will bury that under
everything else. There should be a tool built for exactly "just show
me the top of this file" instead.`
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: 'folder',
      name: 'mainframe',
      requiresKey: 'KEY_11',
      children: [
        {
          type: 'file',
          name: 'boot_notice.txt',
          content:
`MAINFRAME - CORE ACCESS LAYER

You're close to the center of this now. Everything up to this point
was scattered on purpose, in case only part of the drive survived.
This is where it all reconnects.

The core config file below is long, but the only line you need is
right at the top. Try: head core_config.txt`
        },
        {
          type: 'file',
          name: 'core_config.txt',
          large: true,
          content:
`[FILE TOO LARGE TO DISPLAY WITH cat]
Try: head core_config.txt`,
          fullContent:
`INIT_KEY=C0R3-4415
loaded module: auth
loaded module: telemetry
loaded module: legacy_bridge
loaded module: watchdog
loaded module: replication
-- 340 more lines of boot log follow, none of them relevant --`
        },
        {
          type: 'folder',
          name: 'core',
          requiresKey: 'KEY_12',
          children: [
            {
              type: 'file',
              name: 'core_notes.txt',
              content:
`CORE - PERSONAL NOTES

If you're reading this, congratulations, you're deeper into my old
life than anyone I trusted while I was still employed here.

Two paths split from here. I labelled them vault_alpha and
vault_beta. Alpha has who I am. Beta has where to find me. You'll
want both before the last door opens - one without the other is
useless. Same code opens both:

  VX-8841`
            },
            {
              type: 'folder',
              name: 'vault_alpha',
              requiresKey: 'KEY_13',
              children: [
                {
                  type: 'file',
                  name: 'letter_fragment.txt',
                  content:
`Half a letter, unsent:

"...you'll remember my access code from beta wing, the one built
from a year and a rack number. Whoever finds this — that same
number is the last four digits of what opens this vault's inner
folder. Add the prefix ID- in front of it and you have your key."`
                },
                {
                  type: 'folder',
                  name: 'identity',
                  requiresKey: 'KEY_14',
                  children: [
                    {
                      type: 'file',
                      name: 'identity.txt',
                      content:
`IDENTITY CONFIRMED

Subject: K. ASHWORTH
Personal designator used in later systems: KA07
(consistent with him - same rack number again)

Whoever's reading this: you now know who built this system. You
still need to know where he went.`
                    }
                  ]
                }
              ]
            },
            {
              type: 'folder',
              name: 'vault_beta',
              requiresKey: 'KEY_13',
              children: [
                {
                  type: 'file',
                  name: 'coordinates_notice.txt',
                  content:
`SEARCH LOG - VAULT BETA

There's a wide dump of raw sensor pings in this folder. Somewhere
in there is a line tagged "SAFEHOUSE". Search for it instead of
reading the whole thing.`
                },
                {
                  type: 'file',
                  name: 'sensor_dump.txt',
                  large: true,
                  content:
`[FILE TOO LARGE TO DISPLAY WITH cat]
Try: grep "SAFEHOUSE" sensor_dump.txt`,
                  fullContent: Array.from({ length: 35 }, (_, i) => {
                    const n = String(i + 1).padStart(4, '0');
                    if (i === 19) {
                      return `${n} PING tag=SAFEHOUSE code=CO-3391 status=last_known_good`;
                    }
                    return `${n} PING tag=routine-${i % 4} status=nominal drift=${(i * 3) % 9}ms`;
                  }).join('\n')
                },
                {
                  type: 'folder',
                  name: 'coordinates',
                  requiresKey: 'KEY_15',
                  children: [
                    {
                      type: 'file',
                      name: 'coordinates.txt',
                      content:
`LOCATION CONFIRMED

Safehouse designator: 3391 (matches the SAFEHOUSE ping exactly)

You have a name and a place. This system builds its codes the same
way every time — a short prefix, then the part that actually means
something. You know both halves now.`
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: 'folder',
      name: 'final_uplink',
      requiresKey: 'KEY_16',
      children: [
        {
          type: 'file',
          name: 'welcome.txt',
          content:
`FINAL UPLINK

You have an identity and a location. That combination was the key
to get in here - not a code hidden in a file this time, just the
two things you'd already carried the whole way.

There's one more door. Check the other file here for its code.`
        },
        {
          type: 'file',
          name: 'access_note.txt',
          content:
`CORE ACCESS - NOTE

  CA-5510

That opens core_access. Almost done.`
        },
        {
          type: 'folder',
          name: 'core_access',
          requiresKey: 'KEY_17',
          children: [
            {
              type: 'file',
              name: 'black_box_notice.txt',
              content:
`CORE ACCESS - BLACK BOX RECORDER

One transcript left in this folder before the black box itself
unlocks. It's long. Search it for the word "CHRYSALIS" - that's a
project name nobody outside one specific room was ever supposed to
know.`
            },
            {
              type: 'file',
              name: 'transcript.txt',
              large: true,
              content:
`[FILE TOO LARGE TO DISPLAY WITH cat]
Try: grep "CHRYSALIS" transcript.txt`,
              fullContent: Array.from({ length: 30 }, (_, i) => {
                const n = String(i + 1).padStart(4, '0');
                if (i === 24) {
                  return `${n} SPEAKER_B: "Project CHRYSALIS goes dark tonight. unlock_code=CH-8850. Nobody outside this room repeats that name."`;
                }
                return `${n} SPEAKER_A: routine meeting chatter, nothing of note, timestamp drift ${(i * 2) % 11}s`;
              }).join('\n')
            },
            {
              type: 'folder',
              name: 'black_box',
              requiresKey: 'KEY_18',
              children: [
                {
                  type: 'file',
                  name: 'recording_transcript.txt',
                  content:
`BLACK BOX - FINAL RECORDING (transcribed)

"If someone's reading this, the report never made it out the front
door, so this is the back door. Project CHRYSALIS is a monitoring
pilot running on employee personal devices, disguised internally as
a 'wellness telemetry program.' I found it by accident. I reported
it. Three days later I was 'voluntarily' terminated.

Everything on this drive is the evidence. One folder left. The code
to open it is the same word this recorder used to log its own
shutdown:

  TRUTH-0001"`
                }
              ]
            }
          ]
        },
        {
          type: 'folder',
          name: 'the_truth',
          requiresKey: 'KEY_19',
          children: [
            {
              type: 'file',
              name: 'final_message.txt',
              content:
`If you've read this far, you now know what I knew: this company was
running a monitoring program on its own employees' personal devices,
dressed up internally as a "wellness telemetry pilot." Project
CHRYSALIS. I found it by accident, tried to report it internally,
and got quietly terminated for it instead.

I built this whole drive as a dead-man's switch, because I didn't
trust the report to survive if I went through the front door.

Whoever you are - you did the actual work of finding it. That
matters more than anything I could've said in a single readme.

One formality left. This system was built to close itself out once
someone actually got here. The shutdown code was always going to be
the last thing I typed before I disappeared:

  END-0000

  - K. Ashworth`
            }
          ]
        }
      ]
    }
  ]
};

module.exports = filesystem;
