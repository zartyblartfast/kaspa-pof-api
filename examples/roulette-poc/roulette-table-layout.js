// Visual roulette table geometry only. Round state, result, proof, and verification come from /v1 API responses.
const ROULETTE_TABLE_LAYOUT = {
  "schema": "kaspa-fair-roulette-table-layout-v1",
  "roulette_variant": "european",
  "coordinate_system": {
    "units": "arbitrary table units",
    "origin": "top-left",
    "clickable_region_contract": "all clickable regions have x, y, width, height"
  },
  "mainnet_supported": false,
  "colour_sets": {
    "green": [
      0
    ],
    "red": [
      1,
      3,
      5,
      7,
      9,
      12,
      14,
      16,
      18,
      19,
      21,
      23,
      25,
      27,
      30,
      32,
      34,
      36
    ],
    "black": [
      2,
      4,
      6,
      8,
      10,
      11,
      13,
      15,
      17,
      20,
      22,
      24,
      26,
      28,
      29,
      31,
      33,
      35
    ]
  },
  "layout": {
    "zero_position": "left",
    "main_grid": {
      "columns": 12,
      "rows": 3,
      "origin": {
        "x": 10,
        "y": 0
      },
      "cell_size": {
        "width": 10,
        "height": 10
      },
      "top_row": [
        3,
        6,
        9,
        12,
        15,
        18,
        21,
        24,
        27,
        30,
        33,
        36
      ],
      "middle_row": [
        2,
        5,
        8,
        11,
        14,
        17,
        20,
        23,
        26,
        29,
        32,
        35
      ],
      "bottom_row": [
        1,
        4,
        7,
        10,
        13,
        16,
        19,
        22,
        25,
        28,
        31,
        34
      ]
    },
    "column_selector_position": "right_of_main_grid",
    "dozens_position": "below_main_grid",
    "outside_bets_position": "below_dozens"
  },
  "regions": {
    "number_cells": [
      {
        "id": "straight_0",
        "label": "0",
        "bet_type": "straight",
        "number": 0,
        "covered_numbers": [
          0
        ],
        "colour": "green",
        "payout_multiplier": 35,
        "rect": {
          "x": 0,
          "y": 0,
          "width": 10,
          "height": 30
        },
        "chip_anchor": {
          "x": 5,
          "y": 15
        }
      },
      {
        "id": "straight_3",
        "label": "3",
        "bet_type": "straight",
        "number": 3,
        "covered_numbers": [
          3
        ],
        "colour": "red",
        "payout_multiplier": 35,
        "rect": {
          "x": 10,
          "y": 0,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 15,
          "y": 5
        }
      },
      {
        "id": "straight_2",
        "label": "2",
        "bet_type": "straight",
        "number": 2,
        "covered_numbers": [
          2
        ],
        "colour": "black",
        "payout_multiplier": 35,
        "rect": {
          "x": 10,
          "y": 10,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 15,
          "y": 15
        }
      },
      {
        "id": "straight_1",
        "label": "1",
        "bet_type": "straight",
        "number": 1,
        "covered_numbers": [
          1
        ],
        "colour": "red",
        "payout_multiplier": 35,
        "rect": {
          "x": 10,
          "y": 20,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 15,
          "y": 25
        }
      },
      {
        "id": "straight_6",
        "label": "6",
        "bet_type": "straight",
        "number": 6,
        "covered_numbers": [
          6
        ],
        "colour": "black",
        "payout_multiplier": 35,
        "rect": {
          "x": 20,
          "y": 0,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 25,
          "y": 5
        }
      },
      {
        "id": "straight_5",
        "label": "5",
        "bet_type": "straight",
        "number": 5,
        "covered_numbers": [
          5
        ],
        "colour": "red",
        "payout_multiplier": 35,
        "rect": {
          "x": 20,
          "y": 10,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 25,
          "y": 15
        }
      },
      {
        "id": "straight_4",
        "label": "4",
        "bet_type": "straight",
        "number": 4,
        "covered_numbers": [
          4
        ],
        "colour": "black",
        "payout_multiplier": 35,
        "rect": {
          "x": 20,
          "y": 20,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 25,
          "y": 25
        }
      },
      {
        "id": "straight_9",
        "label": "9",
        "bet_type": "straight",
        "number": 9,
        "covered_numbers": [
          9
        ],
        "colour": "red",
        "payout_multiplier": 35,
        "rect": {
          "x": 30,
          "y": 0,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 35,
          "y": 5
        }
      },
      {
        "id": "straight_8",
        "label": "8",
        "bet_type": "straight",
        "number": 8,
        "covered_numbers": [
          8
        ],
        "colour": "black",
        "payout_multiplier": 35,
        "rect": {
          "x": 30,
          "y": 10,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 35,
          "y": 15
        }
      },
      {
        "id": "straight_7",
        "label": "7",
        "bet_type": "straight",
        "number": 7,
        "covered_numbers": [
          7
        ],
        "colour": "red",
        "payout_multiplier": 35,
        "rect": {
          "x": 30,
          "y": 20,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 35,
          "y": 25
        }
      },
      {
        "id": "straight_12",
        "label": "12",
        "bet_type": "straight",
        "number": 12,
        "covered_numbers": [
          12
        ],
        "colour": "red",
        "payout_multiplier": 35,
        "rect": {
          "x": 40,
          "y": 0,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 45,
          "y": 5
        }
      },
      {
        "id": "straight_11",
        "label": "11",
        "bet_type": "straight",
        "number": 11,
        "covered_numbers": [
          11
        ],
        "colour": "black",
        "payout_multiplier": 35,
        "rect": {
          "x": 40,
          "y": 10,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 45,
          "y": 15
        }
      },
      {
        "id": "straight_10",
        "label": "10",
        "bet_type": "straight",
        "number": 10,
        "covered_numbers": [
          10
        ],
        "colour": "black",
        "payout_multiplier": 35,
        "rect": {
          "x": 40,
          "y": 20,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 45,
          "y": 25
        }
      },
      {
        "id": "straight_15",
        "label": "15",
        "bet_type": "straight",
        "number": 15,
        "covered_numbers": [
          15
        ],
        "colour": "black",
        "payout_multiplier": 35,
        "rect": {
          "x": 50,
          "y": 0,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 55,
          "y": 5
        }
      },
      {
        "id": "straight_14",
        "label": "14",
        "bet_type": "straight",
        "number": 14,
        "covered_numbers": [
          14
        ],
        "colour": "red",
        "payout_multiplier": 35,
        "rect": {
          "x": 50,
          "y": 10,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 55,
          "y": 15
        }
      },
      {
        "id": "straight_13",
        "label": "13",
        "bet_type": "straight",
        "number": 13,
        "covered_numbers": [
          13
        ],
        "colour": "black",
        "payout_multiplier": 35,
        "rect": {
          "x": 50,
          "y": 20,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 55,
          "y": 25
        }
      },
      {
        "id": "straight_18",
        "label": "18",
        "bet_type": "straight",
        "number": 18,
        "covered_numbers": [
          18
        ],
        "colour": "red",
        "payout_multiplier": 35,
        "rect": {
          "x": 60,
          "y": 0,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 65,
          "y": 5
        }
      },
      {
        "id": "straight_17",
        "label": "17",
        "bet_type": "straight",
        "number": 17,
        "covered_numbers": [
          17
        ],
        "colour": "black",
        "payout_multiplier": 35,
        "rect": {
          "x": 60,
          "y": 10,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 65,
          "y": 15
        }
      },
      {
        "id": "straight_16",
        "label": "16",
        "bet_type": "straight",
        "number": 16,
        "covered_numbers": [
          16
        ],
        "colour": "red",
        "payout_multiplier": 35,
        "rect": {
          "x": 60,
          "y": 20,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 65,
          "y": 25
        }
      },
      {
        "id": "straight_21",
        "label": "21",
        "bet_type": "straight",
        "number": 21,
        "covered_numbers": [
          21
        ],
        "colour": "red",
        "payout_multiplier": 35,
        "rect": {
          "x": 70,
          "y": 0,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 75,
          "y": 5
        }
      },
      {
        "id": "straight_20",
        "label": "20",
        "bet_type": "straight",
        "number": 20,
        "covered_numbers": [
          20
        ],
        "colour": "black",
        "payout_multiplier": 35,
        "rect": {
          "x": 70,
          "y": 10,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 75,
          "y": 15
        }
      },
      {
        "id": "straight_19",
        "label": "19",
        "bet_type": "straight",
        "number": 19,
        "covered_numbers": [
          19
        ],
        "colour": "red",
        "payout_multiplier": 35,
        "rect": {
          "x": 70,
          "y": 20,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 75,
          "y": 25
        }
      },
      {
        "id": "straight_24",
        "label": "24",
        "bet_type": "straight",
        "number": 24,
        "covered_numbers": [
          24
        ],
        "colour": "black",
        "payout_multiplier": 35,
        "rect": {
          "x": 80,
          "y": 0,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 85,
          "y": 5
        }
      },
      {
        "id": "straight_23",
        "label": "23",
        "bet_type": "straight",
        "number": 23,
        "covered_numbers": [
          23
        ],
        "colour": "red",
        "payout_multiplier": 35,
        "rect": {
          "x": 80,
          "y": 10,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 85,
          "y": 15
        }
      },
      {
        "id": "straight_22",
        "label": "22",
        "bet_type": "straight",
        "number": 22,
        "covered_numbers": [
          22
        ],
        "colour": "black",
        "payout_multiplier": 35,
        "rect": {
          "x": 80,
          "y": 20,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 85,
          "y": 25
        }
      },
      {
        "id": "straight_27",
        "label": "27",
        "bet_type": "straight",
        "number": 27,
        "covered_numbers": [
          27
        ],
        "colour": "red",
        "payout_multiplier": 35,
        "rect": {
          "x": 90,
          "y": 0,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 95,
          "y": 5
        }
      },
      {
        "id": "straight_26",
        "label": "26",
        "bet_type": "straight",
        "number": 26,
        "covered_numbers": [
          26
        ],
        "colour": "black",
        "payout_multiplier": 35,
        "rect": {
          "x": 90,
          "y": 10,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 95,
          "y": 15
        }
      },
      {
        "id": "straight_25",
        "label": "25",
        "bet_type": "straight",
        "number": 25,
        "covered_numbers": [
          25
        ],
        "colour": "red",
        "payout_multiplier": 35,
        "rect": {
          "x": 90,
          "y": 20,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 95,
          "y": 25
        }
      },
      {
        "id": "straight_30",
        "label": "30",
        "bet_type": "straight",
        "number": 30,
        "covered_numbers": [
          30
        ],
        "colour": "red",
        "payout_multiplier": 35,
        "rect": {
          "x": 100,
          "y": 0,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 105,
          "y": 5
        }
      },
      {
        "id": "straight_29",
        "label": "29",
        "bet_type": "straight",
        "number": 29,
        "covered_numbers": [
          29
        ],
        "colour": "black",
        "payout_multiplier": 35,
        "rect": {
          "x": 100,
          "y": 10,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 105,
          "y": 15
        }
      },
      {
        "id": "straight_28",
        "label": "28",
        "bet_type": "straight",
        "number": 28,
        "covered_numbers": [
          28
        ],
        "colour": "black",
        "payout_multiplier": 35,
        "rect": {
          "x": 100,
          "y": 20,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 105,
          "y": 25
        }
      },
      {
        "id": "straight_33",
        "label": "33",
        "bet_type": "straight",
        "number": 33,
        "covered_numbers": [
          33
        ],
        "colour": "black",
        "payout_multiplier": 35,
        "rect": {
          "x": 110,
          "y": 0,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 115,
          "y": 5
        }
      },
      {
        "id": "straight_32",
        "label": "32",
        "bet_type": "straight",
        "number": 32,
        "covered_numbers": [
          32
        ],
        "colour": "red",
        "payout_multiplier": 35,
        "rect": {
          "x": 110,
          "y": 10,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 115,
          "y": 15
        }
      },
      {
        "id": "straight_31",
        "label": "31",
        "bet_type": "straight",
        "number": 31,
        "covered_numbers": [
          31
        ],
        "colour": "black",
        "payout_multiplier": 35,
        "rect": {
          "x": 110,
          "y": 20,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 115,
          "y": 25
        }
      },
      {
        "id": "straight_36",
        "label": "36",
        "bet_type": "straight",
        "number": 36,
        "covered_numbers": [
          36
        ],
        "colour": "red",
        "payout_multiplier": 35,
        "rect": {
          "x": 120,
          "y": 0,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 125,
          "y": 5
        }
      },
      {
        "id": "straight_35",
        "label": "35",
        "bet_type": "straight",
        "number": 35,
        "covered_numbers": [
          35
        ],
        "colour": "black",
        "payout_multiplier": 35,
        "rect": {
          "x": 120,
          "y": 10,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 125,
          "y": 15
        }
      },
      {
        "id": "straight_34",
        "label": "34",
        "bet_type": "straight",
        "number": 34,
        "covered_numbers": [
          34
        ],
        "colour": "red",
        "payout_multiplier": 35,
        "rect": {
          "x": 120,
          "y": 20,
          "width": 10,
          "height": 10
        },
        "chip_anchor": {
          "x": 125,
          "y": 25
        }
      }
    ],
    "dozens": [
      {
        "id": "dozen_1",
        "label": "1st 12",
        "bet_type": "dozen",
        "covered_numbers": [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12
        ],
        "payout_multiplier": 2,
        "rect": {
          "x": 10,
          "y": 30,
          "width": 40,
          "height": 6
        },
        "chip_anchor": {
          "x": 30,
          "y": 33
        }
      },
      {
        "id": "dozen_2",
        "label": "2nd 12",
        "bet_type": "dozen",
        "covered_numbers": [
          13,
          14,
          15,
          16,
          17,
          18,
          19,
          20,
          21,
          22,
          23,
          24
        ],
        "payout_multiplier": 2,
        "rect": {
          "x": 50,
          "y": 30,
          "width": 40,
          "height": 6
        },
        "chip_anchor": {
          "x": 70,
          "y": 33
        }
      },
      {
        "id": "dozen_3",
        "label": "3rd 12",
        "bet_type": "dozen",
        "covered_numbers": [
          25,
          26,
          27,
          28,
          29,
          30,
          31,
          32,
          33,
          34,
          35,
          36
        ],
        "payout_multiplier": 2,
        "rect": {
          "x": 90,
          "y": 30,
          "width": 40,
          "height": 6
        },
        "chip_anchor": {
          "x": 110,
          "y": 33
        }
      }
    ],
    "outside_bets": [
      {
        "id": "low",
        "label": "1 to 18",
        "bet_type": "outside",
        "covered_numbers": [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          14,
          15,
          16,
          17,
          18
        ],
        "payout_multiplier": 1,
        "rect": {
          "x": 10,
          "y": 36,
          "width": 20,
          "height": 6
        },
        "chip_anchor": {
          "x": 20,
          "y": 39
        }
      },
      {
        "id": "even",
        "label": "EVEN",
        "bet_type": "outside",
        "covered_numbers": [
          2,
          4,
          6,
          8,
          10,
          12,
          14,
          16,
          18,
          20,
          22,
          24,
          26,
          28,
          30,
          32,
          34,
          36
        ],
        "payout_multiplier": 1,
        "rect": {
          "x": 30,
          "y": 36,
          "width": 20,
          "height": 6
        },
        "chip_anchor": {
          "x": 40,
          "y": 39
        }
      },
      {
        "id": "red",
        "label": "RED",
        "bet_type": "outside",
        "covered_numbers": [
          1,
          3,
          5,
          7,
          9,
          12,
          14,
          16,
          18,
          19,
          21,
          23,
          25,
          27,
          30,
          32,
          34,
          36
        ],
        "payout_multiplier": 1,
        "rect": {
          "x": 50,
          "y": 36,
          "width": 20,
          "height": 6
        },
        "chip_anchor": {
          "x": 60,
          "y": 39
        }
      },
      {
        "id": "black",
        "label": "BLACK",
        "bet_type": "outside",
        "covered_numbers": [
          2,
          4,
          6,
          8,
          10,
          11,
          13,
          15,
          17,
          20,
          22,
          24,
          26,
          28,
          29,
          31,
          33,
          35
        ],
        "payout_multiplier": 1,
        "rect": {
          "x": 70,
          "y": 36,
          "width": 20,
          "height": 6
        },
        "chip_anchor": {
          "x": 80,
          "y": 39
        }
      },
      {
        "id": "odd",
        "label": "ODD",
        "bet_type": "outside",
        "covered_numbers": [
          1,
          3,
          5,
          7,
          9,
          11,
          13,
          15,
          17,
          19,
          21,
          23,
          25,
          27,
          29,
          31,
          33,
          35
        ],
        "payout_multiplier": 1,
        "rect": {
          "x": 90,
          "y": 36,
          "width": 20,
          "height": 6
        },
        "chip_anchor": {
          "x": 100,
          "y": 39
        }
      },
      {
        "id": "high",
        "label": "19 to 36",
        "bet_type": "outside",
        "covered_numbers": [
          19,
          20,
          21,
          22,
          23,
          24,
          25,
          26,
          27,
          28,
          29,
          30,
          31,
          32,
          33,
          34,
          35,
          36
        ],
        "payout_multiplier": 1,
        "rect": {
          "x": 110,
          "y": 36,
          "width": 20,
          "height": 6
        },
        "chip_anchor": {
          "x": 120,
          "y": 39
        }
      }
    ],
    "columns": [
      {
        "id": "column_3",
        "label": "Column 3",
        "bet_type": "column",
        "covered_numbers": [
          3,
          6,
          9,
          12,
          15,
          18,
          21,
          24,
          27,
          30,
          33,
          36
        ],
        "payout_multiplier": 2,
        "rect": {
          "x": 130,
          "y": 0,
          "width": 8,
          "height": 10
        },
        "chip_anchor": {
          "x": 134,
          "y": 5
        }
      },
      {
        "id": "column_2",
        "label": "Column 2",
        "bet_type": "column",
        "covered_numbers": [
          2,
          5,
          8,
          11,
          14,
          17,
          20,
          23,
          26,
          29,
          32,
          35
        ],
        "payout_multiplier": 2,
        "rect": {
          "x": 130,
          "y": 10,
          "width": 8,
          "height": 10
        },
        "chip_anchor": {
          "x": 134,
          "y": 15
        }
      },
      {
        "id": "column_1",
        "label": "Column 1",
        "bet_type": "column",
        "covered_numbers": [
          1,
          4,
          7,
          10,
          13,
          16,
          19,
          22,
          25,
          28,
          31,
          34
        ],
        "payout_multiplier": 2,
        "rect": {
          "x": 130,
          "y": 20,
          "width": 8,
          "height": 10
        },
        "chip_anchor": {
          "x": 134,
          "y": 25
        }
      }
    ],
    "hotspots": {
      "split": [
        {
          "id": "split_1_2",
          "bet_type": "split",
          "label": "1/2",
          "covered_numbers": [
            1,
            2
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 15,
            "y": 20
          },
          "rect": {
            "x": 11,
            "y": 19,
            "width": 8,
            "height": 2
          },
          "ui_note": "Thin horizontal hotspot on the shared edge between vertically adjacent cells."
        },
        {
          "id": "split_2_3",
          "bet_type": "split",
          "label": "2/3",
          "covered_numbers": [
            2,
            3
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 15,
            "y": 10
          },
          "rect": {
            "x": 11,
            "y": 9,
            "width": 8,
            "height": 2
          },
          "ui_note": "Thin horizontal hotspot on the shared edge between vertically adjacent cells."
        },
        {
          "id": "split_4_5",
          "bet_type": "split",
          "label": "4/5",
          "covered_numbers": [
            4,
            5
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 25,
            "y": 20
          },
          "rect": {
            "x": 21,
            "y": 19,
            "width": 8,
            "height": 2
          },
          "ui_note": "Thin horizontal hotspot on the shared edge between vertically adjacent cells."
        },
        {
          "id": "split_5_6",
          "bet_type": "split",
          "label": "5/6",
          "covered_numbers": [
            5,
            6
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 25,
            "y": 10
          },
          "rect": {
            "x": 21,
            "y": 9,
            "width": 8,
            "height": 2
          },
          "ui_note": "Thin horizontal hotspot on the shared edge between vertically adjacent cells."
        },
        {
          "id": "split_7_8",
          "bet_type": "split",
          "label": "7/8",
          "covered_numbers": [
            7,
            8
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 35,
            "y": 20
          },
          "rect": {
            "x": 31,
            "y": 19,
            "width": 8,
            "height": 2
          },
          "ui_note": "Thin horizontal hotspot on the shared edge between vertically adjacent cells."
        },
        {
          "id": "split_8_9",
          "bet_type": "split",
          "label": "8/9",
          "covered_numbers": [
            8,
            9
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 35,
            "y": 10
          },
          "rect": {
            "x": 31,
            "y": 9,
            "width": 8,
            "height": 2
          },
          "ui_note": "Thin horizontal hotspot on the shared edge between vertically adjacent cells."
        },
        {
          "id": "split_10_11",
          "bet_type": "split",
          "label": "10/11",
          "covered_numbers": [
            10,
            11
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 45,
            "y": 20
          },
          "rect": {
            "x": 41,
            "y": 19,
            "width": 8,
            "height": 2
          },
          "ui_note": "Thin horizontal hotspot on the shared edge between vertically adjacent cells."
        },
        {
          "id": "split_11_12",
          "bet_type": "split",
          "label": "11/12",
          "covered_numbers": [
            11,
            12
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 45,
            "y": 10
          },
          "rect": {
            "x": 41,
            "y": 9,
            "width": 8,
            "height": 2
          },
          "ui_note": "Thin horizontal hotspot on the shared edge between vertically adjacent cells."
        },
        {
          "id": "split_13_14",
          "bet_type": "split",
          "label": "13/14",
          "covered_numbers": [
            13,
            14
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 55,
            "y": 20
          },
          "rect": {
            "x": 51,
            "y": 19,
            "width": 8,
            "height": 2
          },
          "ui_note": "Thin horizontal hotspot on the shared edge between vertically adjacent cells."
        },
        {
          "id": "split_14_15",
          "bet_type": "split",
          "label": "14/15",
          "covered_numbers": [
            14,
            15
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 55,
            "y": 10
          },
          "rect": {
            "x": 51,
            "y": 9,
            "width": 8,
            "height": 2
          },
          "ui_note": "Thin horizontal hotspot on the shared edge between vertically adjacent cells."
        },
        {
          "id": "split_16_17",
          "bet_type": "split",
          "label": "16/17",
          "covered_numbers": [
            16,
            17
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 65,
            "y": 20
          },
          "rect": {
            "x": 61,
            "y": 19,
            "width": 8,
            "height": 2
          },
          "ui_note": "Thin horizontal hotspot on the shared edge between vertically adjacent cells."
        },
        {
          "id": "split_17_18",
          "bet_type": "split",
          "label": "17/18",
          "covered_numbers": [
            17,
            18
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 65,
            "y": 10
          },
          "rect": {
            "x": 61,
            "y": 9,
            "width": 8,
            "height": 2
          },
          "ui_note": "Thin horizontal hotspot on the shared edge between vertically adjacent cells."
        },
        {
          "id": "split_19_20",
          "bet_type": "split",
          "label": "19/20",
          "covered_numbers": [
            19,
            20
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 75,
            "y": 20
          },
          "rect": {
            "x": 71,
            "y": 19,
            "width": 8,
            "height": 2
          },
          "ui_note": "Thin horizontal hotspot on the shared edge between vertically adjacent cells."
        },
        {
          "id": "split_20_21",
          "bet_type": "split",
          "label": "20/21",
          "covered_numbers": [
            20,
            21
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 75,
            "y": 10
          },
          "rect": {
            "x": 71,
            "y": 9,
            "width": 8,
            "height": 2
          },
          "ui_note": "Thin horizontal hotspot on the shared edge between vertically adjacent cells."
        },
        {
          "id": "split_22_23",
          "bet_type": "split",
          "label": "22/23",
          "covered_numbers": [
            22,
            23
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 85,
            "y": 20
          },
          "rect": {
            "x": 81,
            "y": 19,
            "width": 8,
            "height": 2
          },
          "ui_note": "Thin horizontal hotspot on the shared edge between vertically adjacent cells."
        },
        {
          "id": "split_23_24",
          "bet_type": "split",
          "label": "23/24",
          "covered_numbers": [
            23,
            24
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 85,
            "y": 10
          },
          "rect": {
            "x": 81,
            "y": 9,
            "width": 8,
            "height": 2
          },
          "ui_note": "Thin horizontal hotspot on the shared edge between vertically adjacent cells."
        },
        {
          "id": "split_25_26",
          "bet_type": "split",
          "label": "25/26",
          "covered_numbers": [
            25,
            26
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 95,
            "y": 20
          },
          "rect": {
            "x": 91,
            "y": 19,
            "width": 8,
            "height": 2
          },
          "ui_note": "Thin horizontal hotspot on the shared edge between vertically adjacent cells."
        },
        {
          "id": "split_26_27",
          "bet_type": "split",
          "label": "26/27",
          "covered_numbers": [
            26,
            27
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 95,
            "y": 10
          },
          "rect": {
            "x": 91,
            "y": 9,
            "width": 8,
            "height": 2
          },
          "ui_note": "Thin horizontal hotspot on the shared edge between vertically adjacent cells."
        },
        {
          "id": "split_28_29",
          "bet_type": "split",
          "label": "28/29",
          "covered_numbers": [
            28,
            29
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 105,
            "y": 20
          },
          "rect": {
            "x": 101,
            "y": 19,
            "width": 8,
            "height": 2
          },
          "ui_note": "Thin horizontal hotspot on the shared edge between vertically adjacent cells."
        },
        {
          "id": "split_29_30",
          "bet_type": "split",
          "label": "29/30",
          "covered_numbers": [
            29,
            30
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 105,
            "y": 10
          },
          "rect": {
            "x": 101,
            "y": 9,
            "width": 8,
            "height": 2
          },
          "ui_note": "Thin horizontal hotspot on the shared edge between vertically adjacent cells."
        },
        {
          "id": "split_31_32",
          "bet_type": "split",
          "label": "31/32",
          "covered_numbers": [
            31,
            32
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 115,
            "y": 20
          },
          "rect": {
            "x": 111,
            "y": 19,
            "width": 8,
            "height": 2
          },
          "ui_note": "Thin horizontal hotspot on the shared edge between vertically adjacent cells."
        },
        {
          "id": "split_32_33",
          "bet_type": "split",
          "label": "32/33",
          "covered_numbers": [
            32,
            33
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 115,
            "y": 10
          },
          "rect": {
            "x": 111,
            "y": 9,
            "width": 8,
            "height": 2
          },
          "ui_note": "Thin horizontal hotspot on the shared edge between vertically adjacent cells."
        },
        {
          "id": "split_34_35",
          "bet_type": "split",
          "label": "34/35",
          "covered_numbers": [
            34,
            35
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 125,
            "y": 20
          },
          "rect": {
            "x": 121,
            "y": 19,
            "width": 8,
            "height": 2
          },
          "ui_note": "Thin horizontal hotspot on the shared edge between vertically adjacent cells."
        },
        {
          "id": "split_35_36",
          "bet_type": "split",
          "label": "35/36",
          "covered_numbers": [
            35,
            36
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 125,
            "y": 10
          },
          "rect": {
            "x": 121,
            "y": 9,
            "width": 8,
            "height": 2
          },
          "ui_note": "Thin horizontal hotspot on the shared edge between vertically adjacent cells."
        },
        {
          "id": "split_3_6",
          "bet_type": "split",
          "label": "3/6",
          "covered_numbers": [
            3,
            6
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 20,
            "y": 5
          },
          "rect": {
            "x": 19,
            "y": 1,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_2_5",
          "bet_type": "split",
          "label": "2/5",
          "covered_numbers": [
            2,
            5
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 20,
            "y": 15
          },
          "rect": {
            "x": 19,
            "y": 11,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_1_4",
          "bet_type": "split",
          "label": "1/4",
          "covered_numbers": [
            1,
            4
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 20,
            "y": 25
          },
          "rect": {
            "x": 19,
            "y": 21,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_6_9",
          "bet_type": "split",
          "label": "6/9",
          "covered_numbers": [
            6,
            9
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 30,
            "y": 5
          },
          "rect": {
            "x": 29,
            "y": 1,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_5_8",
          "bet_type": "split",
          "label": "5/8",
          "covered_numbers": [
            5,
            8
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 30,
            "y": 15
          },
          "rect": {
            "x": 29,
            "y": 11,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_4_7",
          "bet_type": "split",
          "label": "4/7",
          "covered_numbers": [
            4,
            7
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 30,
            "y": 25
          },
          "rect": {
            "x": 29,
            "y": 21,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_9_12",
          "bet_type": "split",
          "label": "9/12",
          "covered_numbers": [
            9,
            12
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 40,
            "y": 5
          },
          "rect": {
            "x": 39,
            "y": 1,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_8_11",
          "bet_type": "split",
          "label": "8/11",
          "covered_numbers": [
            8,
            11
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 40,
            "y": 15
          },
          "rect": {
            "x": 39,
            "y": 11,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_7_10",
          "bet_type": "split",
          "label": "7/10",
          "covered_numbers": [
            7,
            10
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 40,
            "y": 25
          },
          "rect": {
            "x": 39,
            "y": 21,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_12_15",
          "bet_type": "split",
          "label": "12/15",
          "covered_numbers": [
            12,
            15
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 50,
            "y": 5
          },
          "rect": {
            "x": 49,
            "y": 1,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_11_14",
          "bet_type": "split",
          "label": "11/14",
          "covered_numbers": [
            11,
            14
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 50,
            "y": 15
          },
          "rect": {
            "x": 49,
            "y": 11,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_10_13",
          "bet_type": "split",
          "label": "10/13",
          "covered_numbers": [
            10,
            13
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 50,
            "y": 25
          },
          "rect": {
            "x": 49,
            "y": 21,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_15_18",
          "bet_type": "split",
          "label": "15/18",
          "covered_numbers": [
            15,
            18
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 60,
            "y": 5
          },
          "rect": {
            "x": 59,
            "y": 1,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_14_17",
          "bet_type": "split",
          "label": "14/17",
          "covered_numbers": [
            14,
            17
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 60,
            "y": 15
          },
          "rect": {
            "x": 59,
            "y": 11,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_13_16",
          "bet_type": "split",
          "label": "13/16",
          "covered_numbers": [
            13,
            16
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 60,
            "y": 25
          },
          "rect": {
            "x": 59,
            "y": 21,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_18_21",
          "bet_type": "split",
          "label": "18/21",
          "covered_numbers": [
            18,
            21
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 70,
            "y": 5
          },
          "rect": {
            "x": 69,
            "y": 1,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_17_20",
          "bet_type": "split",
          "label": "17/20",
          "covered_numbers": [
            17,
            20
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 70,
            "y": 15
          },
          "rect": {
            "x": 69,
            "y": 11,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_16_19",
          "bet_type": "split",
          "label": "16/19",
          "covered_numbers": [
            16,
            19
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 70,
            "y": 25
          },
          "rect": {
            "x": 69,
            "y": 21,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_21_24",
          "bet_type": "split",
          "label": "21/24",
          "covered_numbers": [
            21,
            24
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 80,
            "y": 5
          },
          "rect": {
            "x": 79,
            "y": 1,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_20_23",
          "bet_type": "split",
          "label": "20/23",
          "covered_numbers": [
            20,
            23
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 80,
            "y": 15
          },
          "rect": {
            "x": 79,
            "y": 11,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_19_22",
          "bet_type": "split",
          "label": "19/22",
          "covered_numbers": [
            19,
            22
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 80,
            "y": 25
          },
          "rect": {
            "x": 79,
            "y": 21,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_24_27",
          "bet_type": "split",
          "label": "24/27",
          "covered_numbers": [
            24,
            27
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 90,
            "y": 5
          },
          "rect": {
            "x": 89,
            "y": 1,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_23_26",
          "bet_type": "split",
          "label": "23/26",
          "covered_numbers": [
            23,
            26
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 90,
            "y": 15
          },
          "rect": {
            "x": 89,
            "y": 11,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_22_25",
          "bet_type": "split",
          "label": "22/25",
          "covered_numbers": [
            22,
            25
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 90,
            "y": 25
          },
          "rect": {
            "x": 89,
            "y": 21,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_27_30",
          "bet_type": "split",
          "label": "27/30",
          "covered_numbers": [
            27,
            30
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 100,
            "y": 5
          },
          "rect": {
            "x": 99,
            "y": 1,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_26_29",
          "bet_type": "split",
          "label": "26/29",
          "covered_numbers": [
            26,
            29
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 100,
            "y": 15
          },
          "rect": {
            "x": 99,
            "y": 11,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_25_28",
          "bet_type": "split",
          "label": "25/28",
          "covered_numbers": [
            25,
            28
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 100,
            "y": 25
          },
          "rect": {
            "x": 99,
            "y": 21,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_30_33",
          "bet_type": "split",
          "label": "30/33",
          "covered_numbers": [
            30,
            33
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 110,
            "y": 5
          },
          "rect": {
            "x": 109,
            "y": 1,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_29_32",
          "bet_type": "split",
          "label": "29/32",
          "covered_numbers": [
            29,
            32
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 110,
            "y": 15
          },
          "rect": {
            "x": 109,
            "y": 11,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_28_31",
          "bet_type": "split",
          "label": "28/31",
          "covered_numbers": [
            28,
            31
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 110,
            "y": 25
          },
          "rect": {
            "x": 109,
            "y": 21,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_33_36",
          "bet_type": "split",
          "label": "33/36",
          "covered_numbers": [
            33,
            36
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 120,
            "y": 5
          },
          "rect": {
            "x": 119,
            "y": 1,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_32_35",
          "bet_type": "split",
          "label": "32/35",
          "covered_numbers": [
            32,
            35
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 120,
            "y": 15
          },
          "rect": {
            "x": 119,
            "y": 11,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        },
        {
          "id": "split_31_34",
          "bet_type": "split",
          "label": "31/34",
          "covered_numbers": [
            31,
            34
          ],
          "payout_multiplier": 17,
          "hotspot_kind": "shared_edge",
          "anchor": {
            "x": 120,
            "y": 25
          },
          "rect": {
            "x": 119,
            "y": 21,
            "width": 2,
            "height": 8
          },
          "ui_note": "Thin vertical hotspot on the shared edge between horizontally adjacent cells."
        }
      ],
      "street": [
        {
          "id": "street_1_2_3",
          "bet_type": "street",
          "label": "1/2/3",
          "covered_numbers": [
            1,
            2,
            3
          ],
          "payout_multiplier": 11,
          "hotspot_kind": "column_end",
          "anchor": {
            "x": 20,
            "y": 15
          },
          "rect": {
            "x": 19,
            "y": 1,
            "width": 2,
            "height": 28
          },
          "ui_note": "Future street hotspot aligned to the outside edge of a three-number column."
        },
        {
          "id": "street_4_5_6",
          "bet_type": "street",
          "label": "4/5/6",
          "covered_numbers": [
            4,
            5,
            6
          ],
          "payout_multiplier": 11,
          "hotspot_kind": "column_end",
          "anchor": {
            "x": 30,
            "y": 15
          },
          "rect": {
            "x": 29,
            "y": 1,
            "width": 2,
            "height": 28
          },
          "ui_note": "Future street hotspot aligned to the outside edge of a three-number column."
        },
        {
          "id": "street_7_8_9",
          "bet_type": "street",
          "label": "7/8/9",
          "covered_numbers": [
            7,
            8,
            9
          ],
          "payout_multiplier": 11,
          "hotspot_kind": "column_end",
          "anchor": {
            "x": 40,
            "y": 15
          },
          "rect": {
            "x": 39,
            "y": 1,
            "width": 2,
            "height": 28
          },
          "ui_note": "Future street hotspot aligned to the outside edge of a three-number column."
        },
        {
          "id": "street_10_11_12",
          "bet_type": "street",
          "label": "10/11/12",
          "covered_numbers": [
            10,
            11,
            12
          ],
          "payout_multiplier": 11,
          "hotspot_kind": "column_end",
          "anchor": {
            "x": 50,
            "y": 15
          },
          "rect": {
            "x": 49,
            "y": 1,
            "width": 2,
            "height": 28
          },
          "ui_note": "Future street hotspot aligned to the outside edge of a three-number column."
        },
        {
          "id": "street_13_14_15",
          "bet_type": "street",
          "label": "13/14/15",
          "covered_numbers": [
            13,
            14,
            15
          ],
          "payout_multiplier": 11,
          "hotspot_kind": "column_end",
          "anchor": {
            "x": 60,
            "y": 15
          },
          "rect": {
            "x": 59,
            "y": 1,
            "width": 2,
            "height": 28
          },
          "ui_note": "Future street hotspot aligned to the outside edge of a three-number column."
        },
        {
          "id": "street_16_17_18",
          "bet_type": "street",
          "label": "16/17/18",
          "covered_numbers": [
            16,
            17,
            18
          ],
          "payout_multiplier": 11,
          "hotspot_kind": "column_end",
          "anchor": {
            "x": 70,
            "y": 15
          },
          "rect": {
            "x": 69,
            "y": 1,
            "width": 2,
            "height": 28
          },
          "ui_note": "Future street hotspot aligned to the outside edge of a three-number column."
        },
        {
          "id": "street_19_20_21",
          "bet_type": "street",
          "label": "19/20/21",
          "covered_numbers": [
            19,
            20,
            21
          ],
          "payout_multiplier": 11,
          "hotspot_kind": "column_end",
          "anchor": {
            "x": 80,
            "y": 15
          },
          "rect": {
            "x": 79,
            "y": 1,
            "width": 2,
            "height": 28
          },
          "ui_note": "Future street hotspot aligned to the outside edge of a three-number column."
        },
        {
          "id": "street_22_23_24",
          "bet_type": "street",
          "label": "22/23/24",
          "covered_numbers": [
            22,
            23,
            24
          ],
          "payout_multiplier": 11,
          "hotspot_kind": "column_end",
          "anchor": {
            "x": 90,
            "y": 15
          },
          "rect": {
            "x": 89,
            "y": 1,
            "width": 2,
            "height": 28
          },
          "ui_note": "Future street hotspot aligned to the outside edge of a three-number column."
        },
        {
          "id": "street_25_26_27",
          "bet_type": "street",
          "label": "25/26/27",
          "covered_numbers": [
            25,
            26,
            27
          ],
          "payout_multiplier": 11,
          "hotspot_kind": "column_end",
          "anchor": {
            "x": 100,
            "y": 15
          },
          "rect": {
            "x": 99,
            "y": 1,
            "width": 2,
            "height": 28
          },
          "ui_note": "Future street hotspot aligned to the outside edge of a three-number column."
        },
        {
          "id": "street_28_29_30",
          "bet_type": "street",
          "label": "28/29/30",
          "covered_numbers": [
            28,
            29,
            30
          ],
          "payout_multiplier": 11,
          "hotspot_kind": "column_end",
          "anchor": {
            "x": 110,
            "y": 15
          },
          "rect": {
            "x": 109,
            "y": 1,
            "width": 2,
            "height": 28
          },
          "ui_note": "Future street hotspot aligned to the outside edge of a three-number column."
        },
        {
          "id": "street_31_32_33",
          "bet_type": "street",
          "label": "31/32/33",
          "covered_numbers": [
            31,
            32,
            33
          ],
          "payout_multiplier": 11,
          "hotspot_kind": "column_end",
          "anchor": {
            "x": 120,
            "y": 15
          },
          "rect": {
            "x": 119,
            "y": 1,
            "width": 2,
            "height": 28
          },
          "ui_note": "Future street hotspot aligned to the outside edge of a three-number column."
        },
        {
          "id": "street_34_35_36",
          "bet_type": "street",
          "label": "34/35/36",
          "covered_numbers": [
            34,
            35,
            36
          ],
          "payout_multiplier": 11,
          "hotspot_kind": "column_end",
          "anchor": {
            "x": 130,
            "y": 15
          },
          "rect": {
            "x": 129,
            "y": 1,
            "width": 2,
            "height": 28
          },
          "ui_note": "Future street hotspot aligned to the outside edge of a three-number column."
        }
      ],
      "corner": [
        {
          "id": "corner_2_3_5_6",
          "bet_type": "corner",
          "label": "2/3/5/6",
          "covered_numbers": [
            2,
            3,
            5,
            6
          ],
          "payout_multiplier": 8,
          "hotspot_kind": "intersection",
          "anchor": {
            "x": 20,
            "y": 10
          },
          "rect": {
            "x": 18.5,
            "y": 8.5,
            "width": 3,
            "height": 3
          },
          "ui_note": "Future corner hotspot centered on the intersection of four adjacent number cells."
        },
        {
          "id": "corner_1_2_4_5",
          "bet_type": "corner",
          "label": "1/2/4/5",
          "covered_numbers": [
            1,
            2,
            4,
            5
          ],
          "payout_multiplier": 8,
          "hotspot_kind": "intersection",
          "anchor": {
            "x": 20,
            "y": 20
          },
          "rect": {
            "x": 18.5,
            "y": 18.5,
            "width": 3,
            "height": 3
          },
          "ui_note": "Future corner hotspot centered on the intersection of four adjacent number cells."
        },
        {
          "id": "corner_5_6_8_9",
          "bet_type": "corner",
          "label": "5/6/8/9",
          "covered_numbers": [
            5,
            6,
            8,
            9
          ],
          "payout_multiplier": 8,
          "hotspot_kind": "intersection",
          "anchor": {
            "x": 30,
            "y": 10
          },
          "rect": {
            "x": 28.5,
            "y": 8.5,
            "width": 3,
            "height": 3
          },
          "ui_note": "Future corner hotspot centered on the intersection of four adjacent number cells."
        },
        {
          "id": "corner_4_5_7_8",
          "bet_type": "corner",
          "label": "4/5/7/8",
          "covered_numbers": [
            4,
            5,
            7,
            8
          ],
          "payout_multiplier": 8,
          "hotspot_kind": "intersection",
          "anchor": {
            "x": 30,
            "y": 20
          },
          "rect": {
            "x": 28.5,
            "y": 18.5,
            "width": 3,
            "height": 3
          },
          "ui_note": "Future corner hotspot centered on the intersection of four adjacent number cells."
        },
        {
          "id": "corner_8_9_11_12",
          "bet_type": "corner",
          "label": "8/9/11/12",
          "covered_numbers": [
            8,
            9,
            11,
            12
          ],
          "payout_multiplier": 8,
          "hotspot_kind": "intersection",
          "anchor": {
            "x": 40,
            "y": 10
          },
          "rect": {
            "x": 38.5,
            "y": 8.5,
            "width": 3,
            "height": 3
          },
          "ui_note": "Future corner hotspot centered on the intersection of four adjacent number cells."
        },
        {
          "id": "corner_7_8_10_11",
          "bet_type": "corner",
          "label": "7/8/10/11",
          "covered_numbers": [
            7,
            8,
            10,
            11
          ],
          "payout_multiplier": 8,
          "hotspot_kind": "intersection",
          "anchor": {
            "x": 40,
            "y": 20
          },
          "rect": {
            "x": 38.5,
            "y": 18.5,
            "width": 3,
            "height": 3
          },
          "ui_note": "Future corner hotspot centered on the intersection of four adjacent number cells."
        },
        {
          "id": "corner_11_12_14_15",
          "bet_type": "corner",
          "label": "11/12/14/15",
          "covered_numbers": [
            11,
            12,
            14,
            15
          ],
          "payout_multiplier": 8,
          "hotspot_kind": "intersection",
          "anchor": {
            "x": 50,
            "y": 10
          },
          "rect": {
            "x": 48.5,
            "y": 8.5,
            "width": 3,
            "height": 3
          },
          "ui_note": "Future corner hotspot centered on the intersection of four adjacent number cells."
        },
        {
          "id": "corner_10_11_13_14",
          "bet_type": "corner",
          "label": "10/11/13/14",
          "covered_numbers": [
            10,
            11,
            13,
            14
          ],
          "payout_multiplier": 8,
          "hotspot_kind": "intersection",
          "anchor": {
            "x": 50,
            "y": 20
          },
          "rect": {
            "x": 48.5,
            "y": 18.5,
            "width": 3,
            "height": 3
          },
          "ui_note": "Future corner hotspot centered on the intersection of four adjacent number cells."
        },
        {
          "id": "corner_14_15_17_18",
          "bet_type": "corner",
          "label": "14/15/17/18",
          "covered_numbers": [
            14,
            15,
            17,
            18
          ],
          "payout_multiplier": 8,
          "hotspot_kind": "intersection",
          "anchor": {
            "x": 60,
            "y": 10
          },
          "rect": {
            "x": 58.5,
            "y": 8.5,
            "width": 3,
            "height": 3
          },
          "ui_note": "Future corner hotspot centered on the intersection of four adjacent number cells."
        },
        {
          "id": "corner_13_14_16_17",
          "bet_type": "corner",
          "label": "13/14/16/17",
          "covered_numbers": [
            13,
            14,
            16,
            17
          ],
          "payout_multiplier": 8,
          "hotspot_kind": "intersection",
          "anchor": {
            "x": 60,
            "y": 20
          },
          "rect": {
            "x": 58.5,
            "y": 18.5,
            "width": 3,
            "height": 3
          },
          "ui_note": "Future corner hotspot centered on the intersection of four adjacent number cells."
        },
        {
          "id": "corner_17_18_20_21",
          "bet_type": "corner",
          "label": "17/18/20/21",
          "covered_numbers": [
            17,
            18,
            20,
            21
          ],
          "payout_multiplier": 8,
          "hotspot_kind": "intersection",
          "anchor": {
            "x": 70,
            "y": 10
          },
          "rect": {
            "x": 68.5,
            "y": 8.5,
            "width": 3,
            "height": 3
          },
          "ui_note": "Future corner hotspot centered on the intersection of four adjacent number cells."
        },
        {
          "id": "corner_16_17_19_20",
          "bet_type": "corner",
          "label": "16/17/19/20",
          "covered_numbers": [
            16,
            17,
            19,
            20
          ],
          "payout_multiplier": 8,
          "hotspot_kind": "intersection",
          "anchor": {
            "x": 70,
            "y": 20
          },
          "rect": {
            "x": 68.5,
            "y": 18.5,
            "width": 3,
            "height": 3
          },
          "ui_note": "Future corner hotspot centered on the intersection of four adjacent number cells."
        },
        {
          "id": "corner_20_21_23_24",
          "bet_type": "corner",
          "label": "20/21/23/24",
          "covered_numbers": [
            20,
            21,
            23,
            24
          ],
          "payout_multiplier": 8,
          "hotspot_kind": "intersection",
          "anchor": {
            "x": 80,
            "y": 10
          },
          "rect": {
            "x": 78.5,
            "y": 8.5,
            "width": 3,
            "height": 3
          },
          "ui_note": "Future corner hotspot centered on the intersection of four adjacent number cells."
        },
        {
          "id": "corner_19_20_22_23",
          "bet_type": "corner",
          "label": "19/20/22/23",
          "covered_numbers": [
            19,
            20,
            22,
            23
          ],
          "payout_multiplier": 8,
          "hotspot_kind": "intersection",
          "anchor": {
            "x": 80,
            "y": 20
          },
          "rect": {
            "x": 78.5,
            "y": 18.5,
            "width": 3,
            "height": 3
          },
          "ui_note": "Future corner hotspot centered on the intersection of four adjacent number cells."
        },
        {
          "id": "corner_23_24_26_27",
          "bet_type": "corner",
          "label": "23/24/26/27",
          "covered_numbers": [
            23,
            24,
            26,
            27
          ],
          "payout_multiplier": 8,
          "hotspot_kind": "intersection",
          "anchor": {
            "x": 90,
            "y": 10
          },
          "rect": {
            "x": 88.5,
            "y": 8.5,
            "width": 3,
            "height": 3
          },
          "ui_note": "Future corner hotspot centered on the intersection of four adjacent number cells."
        },
        {
          "id": "corner_22_23_25_26",
          "bet_type": "corner",
          "label": "22/23/25/26",
          "covered_numbers": [
            22,
            23,
            25,
            26
          ],
          "payout_multiplier": 8,
          "hotspot_kind": "intersection",
          "anchor": {
            "x": 90,
            "y": 20
          },
          "rect": {
            "x": 88.5,
            "y": 18.5,
            "width": 3,
            "height": 3
          },
          "ui_note": "Future corner hotspot centered on the intersection of four adjacent number cells."
        },
        {
          "id": "corner_26_27_29_30",
          "bet_type": "corner",
          "label": "26/27/29/30",
          "covered_numbers": [
            26,
            27,
            29,
            30
          ],
          "payout_multiplier": 8,
          "hotspot_kind": "intersection",
          "anchor": {
            "x": 100,
            "y": 10
          },
          "rect": {
            "x": 98.5,
            "y": 8.5,
            "width": 3,
            "height": 3
          },
          "ui_note": "Future corner hotspot centered on the intersection of four adjacent number cells."
        },
        {
          "id": "corner_25_26_28_29",
          "bet_type": "corner",
          "label": "25/26/28/29",
          "covered_numbers": [
            25,
            26,
            28,
            29
          ],
          "payout_multiplier": 8,
          "hotspot_kind": "intersection",
          "anchor": {
            "x": 100,
            "y": 20
          },
          "rect": {
            "x": 98.5,
            "y": 18.5,
            "width": 3,
            "height": 3
          },
          "ui_note": "Future corner hotspot centered on the intersection of four adjacent number cells."
        },
        {
          "id": "corner_29_30_32_33",
          "bet_type": "corner",
          "label": "29/30/32/33",
          "covered_numbers": [
            29,
            30,
            32,
            33
          ],
          "payout_multiplier": 8,
          "hotspot_kind": "intersection",
          "anchor": {
            "x": 110,
            "y": 10
          },
          "rect": {
            "x": 108.5,
            "y": 8.5,
            "width": 3,
            "height": 3
          },
          "ui_note": "Future corner hotspot centered on the intersection of four adjacent number cells."
        },
        {
          "id": "corner_28_29_31_32",
          "bet_type": "corner",
          "label": "28/29/31/32",
          "covered_numbers": [
            28,
            29,
            31,
            32
          ],
          "payout_multiplier": 8,
          "hotspot_kind": "intersection",
          "anchor": {
            "x": 110,
            "y": 20
          },
          "rect": {
            "x": 108.5,
            "y": 18.5,
            "width": 3,
            "height": 3
          },
          "ui_note": "Future corner hotspot centered on the intersection of four adjacent number cells."
        },
        {
          "id": "corner_32_33_35_36",
          "bet_type": "corner",
          "label": "32/33/35/36",
          "covered_numbers": [
            32,
            33,
            35,
            36
          ],
          "payout_multiplier": 8,
          "hotspot_kind": "intersection",
          "anchor": {
            "x": 120,
            "y": 10
          },
          "rect": {
            "x": 118.5,
            "y": 8.5,
            "width": 3,
            "height": 3
          },
          "ui_note": "Future corner hotspot centered on the intersection of four adjacent number cells."
        },
        {
          "id": "corner_31_32_34_35",
          "bet_type": "corner",
          "label": "31/32/34/35",
          "covered_numbers": [
            31,
            32,
            34,
            35
          ],
          "payout_multiplier": 8,
          "hotspot_kind": "intersection",
          "anchor": {
            "x": 120,
            "y": 20
          },
          "rect": {
            "x": 118.5,
            "y": 18.5,
            "width": 3,
            "height": 3
          },
          "ui_note": "Future corner hotspot centered on the intersection of four adjacent number cells."
        }
      ],
      "six_line": [
        {
          "id": "six_line_1_2_3_4_5_6",
          "bet_type": "six_line",
          "label": "1/2/3/4/5/6",
          "covered_numbers": [
            1,
            2,
            3,
            4,
            5,
            6
          ],
          "payout_multiplier": 5,
          "hotspot_kind": "double_column_end",
          "anchor": {
            "x": 20,
            "y": 15
          },
          "rect": {
            "x": 19,
            "y": 1,
            "width": 2,
            "height": 28
          },
          "ui_note": "Future six-line hotspot aligned to the outside edge shared by two adjacent three-number columns."
        },
        {
          "id": "six_line_4_5_6_7_8_9",
          "bet_type": "six_line",
          "label": "4/5/6/7/8/9",
          "covered_numbers": [
            4,
            5,
            6,
            7,
            8,
            9
          ],
          "payout_multiplier": 5,
          "hotspot_kind": "double_column_end",
          "anchor": {
            "x": 30,
            "y": 15
          },
          "rect": {
            "x": 29,
            "y": 1,
            "width": 2,
            "height": 28
          },
          "ui_note": "Future six-line hotspot aligned to the outside edge shared by two adjacent three-number columns."
        },
        {
          "id": "six_line_7_8_9_10_11_12",
          "bet_type": "six_line",
          "label": "7/8/9/10/11/12",
          "covered_numbers": [
            7,
            8,
            9,
            10,
            11,
            12
          ],
          "payout_multiplier": 5,
          "hotspot_kind": "double_column_end",
          "anchor": {
            "x": 40,
            "y": 15
          },
          "rect": {
            "x": 39,
            "y": 1,
            "width": 2,
            "height": 28
          },
          "ui_note": "Future six-line hotspot aligned to the outside edge shared by two adjacent three-number columns."
        },
        {
          "id": "six_line_10_11_12_13_14_15",
          "bet_type": "six_line",
          "label": "10/11/12/13/14/15",
          "covered_numbers": [
            10,
            11,
            12,
            13,
            14,
            15
          ],
          "payout_multiplier": 5,
          "hotspot_kind": "double_column_end",
          "anchor": {
            "x": 50,
            "y": 15
          },
          "rect": {
            "x": 49,
            "y": 1,
            "width": 2,
            "height": 28
          },
          "ui_note": "Future six-line hotspot aligned to the outside edge shared by two adjacent three-number columns."
        },
        {
          "id": "six_line_13_14_15_16_17_18",
          "bet_type": "six_line",
          "label": "13/14/15/16/17/18",
          "covered_numbers": [
            13,
            14,
            15,
            16,
            17,
            18
          ],
          "payout_multiplier": 5,
          "hotspot_kind": "double_column_end",
          "anchor": {
            "x": 60,
            "y": 15
          },
          "rect": {
            "x": 59,
            "y": 1,
            "width": 2,
            "height": 28
          },
          "ui_note": "Future six-line hotspot aligned to the outside edge shared by two adjacent three-number columns."
        },
        {
          "id": "six_line_16_17_18_19_20_21",
          "bet_type": "six_line",
          "label": "16/17/18/19/20/21",
          "covered_numbers": [
            16,
            17,
            18,
            19,
            20,
            21
          ],
          "payout_multiplier": 5,
          "hotspot_kind": "double_column_end",
          "anchor": {
            "x": 70,
            "y": 15
          },
          "rect": {
            "x": 69,
            "y": 1,
            "width": 2,
            "height": 28
          },
          "ui_note": "Future six-line hotspot aligned to the outside edge shared by two adjacent three-number columns."
        },
        {
          "id": "six_line_19_20_21_22_23_24",
          "bet_type": "six_line",
          "label": "19/20/21/22/23/24",
          "covered_numbers": [
            19,
            20,
            21,
            22,
            23,
            24
          ],
          "payout_multiplier": 5,
          "hotspot_kind": "double_column_end",
          "anchor": {
            "x": 80,
            "y": 15
          },
          "rect": {
            "x": 79,
            "y": 1,
            "width": 2,
            "height": 28
          },
          "ui_note": "Future six-line hotspot aligned to the outside edge shared by two adjacent three-number columns."
        },
        {
          "id": "six_line_22_23_24_25_26_27",
          "bet_type": "six_line",
          "label": "22/23/24/25/26/27",
          "covered_numbers": [
            22,
            23,
            24,
            25,
            26,
            27
          ],
          "payout_multiplier": 5,
          "hotspot_kind": "double_column_end",
          "anchor": {
            "x": 90,
            "y": 15
          },
          "rect": {
            "x": 89,
            "y": 1,
            "width": 2,
            "height": 28
          },
          "ui_note": "Future six-line hotspot aligned to the outside edge shared by two adjacent three-number columns."
        },
        {
          "id": "six_line_25_26_27_28_29_30",
          "bet_type": "six_line",
          "label": "25/26/27/28/29/30",
          "covered_numbers": [
            25,
            26,
            27,
            28,
            29,
            30
          ],
          "payout_multiplier": 5,
          "hotspot_kind": "double_column_end",
          "anchor": {
            "x": 100,
            "y": 15
          },
          "rect": {
            "x": 99,
            "y": 1,
            "width": 2,
            "height": 28
          },
          "ui_note": "Future six-line hotspot aligned to the outside edge shared by two adjacent three-number columns."
        },
        {
          "id": "six_line_28_29_30_31_32_33",
          "bet_type": "six_line",
          "label": "28/29/30/31/32/33",
          "covered_numbers": [
            28,
            29,
            30,
            31,
            32,
            33
          ],
          "payout_multiplier": 5,
          "hotspot_kind": "double_column_end",
          "anchor": {
            "x": 110,
            "y": 15
          },
          "rect": {
            "x": 109,
            "y": 1,
            "width": 2,
            "height": 28
          },
          "ui_note": "Future six-line hotspot aligned to the outside edge shared by two adjacent three-number columns."
        },
        {
          "id": "six_line_31_32_33_34_35_36",
          "bet_type": "six_line",
          "label": "31/32/33/34/35/36",
          "covered_numbers": [
            31,
            32,
            33,
            34,
            35,
            36
          ],
          "payout_multiplier": 5,
          "hotspot_kind": "double_column_end",
          "anchor": {
            "x": 120,
            "y": 15
          },
          "rect": {
            "x": 119,
            "y": 1,
            "width": 2,
            "height": 28
          },
          "ui_note": "Future six-line hotspot aligned to the outside edge shared by two adjacent three-number columns."
        }
      ]
    }
  },
  "required_counts": {
    "straight": 37,
    "split": 57,
    "street": 12,
    "corner": 22,
    "six_line": 11,
    "dozen": 3,
    "column": 3,
    "outside_even_money": 6
  },
  "ui_constraints": [
    "ENV-081A defines the table layout schema only.",
    "UI rebuild is deferred to ENV-081B.",
    "No giant inside-zone lists.",
    "No dropdown-based inside-zone betting.",
    "No real betting, real payouts, wallet, backend custody, signing, broadcasting, mainnet, or production casino functionality."
  ],
  "layout_only": true,
  "source": "kaspa-fair-live-roulette visual table geometry"
};

function createRouletteTableLayout() {
  return structuredClone(ROULETTE_TABLE_LAYOUT);
}

window.createRouletteTableLayout = createRouletteTableLayout;
