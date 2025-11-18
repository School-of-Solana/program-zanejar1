/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/decentra_vote.json`.
 */
export type DecentraVote = {
  "address": "FXGf1kvpC6pHSZWbPpLjAuDYNW6Bkax3E4SUEcfdBvwY",
  "metadata": {
    "name": "decentraVote",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "castVote",
      "discriminator": [
        20,
        212,
        15,
        189,
        69,
        180,
        69,
        151
      ],
      "accounts": [
        {
          "name": "event",
          "writable": true
        },
        {
          "name": "voteRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "event"
              },
              {
                "kind": "account",
                "path": "voter"
              }
            ]
          }
        },
        {
          "name": "voter",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "plusChoices",
          "type": "bytes"
        },
        {
          "name": "minusChoices",
          "type": {
            "option": "bytes"
          }
        }
      ]
    },
    {
      "name": "initializeEvent",
      "discriminator": [
        126,
        249,
        86,
        221,
        202,
        171,
        134,
        20
      ],
      "accounts": [
        {
          "name": "event",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  118,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "arg",
                "path": "timestamp"
              }
            ]
          }
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        },
        {
          "name": "choices",
          "type": {
            "vec": "string"
          }
        },
        {
          "name": "deadline",
          "type": "i64"
        },
        {
          "name": "timestamp",
          "type": "i64"
        },
        {
          "name": "maxPlusVotes",
          "type": "u8"
        },
        {
          "name": "allowMinus",
          "type": "bool"
        },
        {
          "name": "maxMinusVotes",
          "type": "u8"
        },
        {
          "name": "minPlusForMinus",
          "type": "u8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "eventAccount",
      "discriminator": [
        98,
        136,
        32,
        165,
        133,
        231,
        243,
        154
      ]
    },
    {
      "name": "voteAccount",
      "discriminator": [
        203,
        238,
        154,
        106,
        200,
        131,
        0,
        41
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "votingClosed",
      "msg": "Voting deadline has passed"
    },
    {
      "code": 6001,
      "name": "alreadyVoted",
      "msg": "You have already voted"
    },
    {
      "code": 6002,
      "name": "invalidChoice",
      "msg": "Invalid choice index"
    },
    {
      "code": 6003,
      "name": "noChoicesProvided",
      "msg": "No choices provided for the event"
    },
    {
      "code": 6004,
      "name": "titleTooLong",
      "msg": "Title is too long (max 64 characters)"
    },
    {
      "code": 6005,
      "name": "descriptionTooLong",
      "msg": "Description is too long (max 256 characters)"
    },
    {
      "code": 6006,
      "name": "invalidConfig",
      "msg": "Invalid event configuration"
    },
    {
      "code": 6007,
      "name": "duplicateChoices",
      "msg": "Duplicate choices provided"
    },
    {
      "code": 6008,
      "name": "choiceOutOfRange",
      "msg": "Choice index out of range"
    },
    {
      "code": 6009,
      "name": "overflow",
      "msg": "Overflow in vote tally"
    },
    {
      "code": 6010,
      "name": "tooManyPlusVotes",
      "msg": "Too many plus votes"
    },
    {
      "code": 6011,
      "name": "minusVotesNotAllowed",
      "msg": "Minus votes are not allowed for this event"
    },
    {
      "code": 6012,
      "name": "tooManyMinusVotes",
      "msg": "Too many minus votes"
    },
    {
      "code": 6013,
      "name": "insufficientPlusVotes",
      "msg": "Insufficient plus votes to cast minus votes"
    },
    {
      "code": 6014,
      "name": "overlappingChoices",
      "msg": "Overlapping choices between plus and minus votes"
    }
  ],
  "types": [
    {
      "name": "eventAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "choices",
            "type": {
              "vec": "string"
            }
          },
          {
            "name": "deadline",
            "type": "i64"
          },
          {
            "name": "maxPlusVotes",
            "type": "u8"
          },
          {
            "name": "allowMinus",
            "type": "bool"
          },
          {
            "name": "maxMinusVotes",
            "type": "u8"
          },
          {
            "name": "minPlusForMinus",
            "type": "u8"
          },
          {
            "name": "totalVotes",
            "type": {
              "vec": "i64"
            }
          }
        ]
      }
    },
    {
      "name": "voteAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "voter",
            "type": "pubkey"
          },
          {
            "name": "hasVoted",
            "type": "bool"
          },
          {
            "name": "plusChoices",
            "type": "bytes"
          },
          {
            "name": "minusChoices",
            "type": "bytes"
          }
        ]
      }
    }
  ]
};
