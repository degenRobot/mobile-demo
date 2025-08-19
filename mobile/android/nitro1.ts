import fs from 'fs'

import { Queue } from 'async-await-queue'
import { createPublicClient, http, parseAbiItem } from 'viem'

import { riseTestnet } from './rise-testnet-chain.ts'

const queue = new Queue(10, 100)

const START_BLOCK = 14369916
const END_BLOCK = 14374599
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '4000')

const publicClient = createPublicClient({
  chain: riseTestnet,
  transport: http(),
})

const toOrderId = (
  bookId: bigint,
  tick: bigint,
  orderIndex: bigint,
): bigint => {
  const tickU24 = tick & (2n ** 24n - 1n)
  return orderIndex + (tickU24 << 40n) + (bookId << 64n)
}

const TICK = -127177n
const BOOK_ID = 2198457051140264547832854906441393802791010045534123136819n

const main = async () => {
  const orderIdToDepth: Record<
    string,
    {
      tick: number
      bookId: bigint
    }
  > = {}
  let depth = 153299n

  const p = []
  for (let i = START_BLOCK; i < END_BLOCK; i += BATCH_SIZE) {
    /* Each iteration is an anonymous async function */
    p.push(
      (async () => {
        const me = Symbol()
        await queue.wait(me, 0)
        try {
          console.log(
            `Processing block from ${
              i === START_BLOCK ? i : i + 1
            } to ${Math.min(i + BATCH_SIZE, END_BLOCK)}`,
          )

          const makeLogs = await publicClient.getLogs({
            address: '0xBc6eaFe723723DED3a411b6a1089a63bc5d73568',
            event: parseAbiItem(
              'event Make(uint192 indexed bookId, address indexed user, int24 tick, uint256 orderIndex, uint64 unit, address provider)',
            ),
            fromBlock: BigInt(i === START_BLOCK ? i : i + 1),
            toBlock: BigInt(Math.min(i + BATCH_SIZE, END_BLOCK)),
          })
          for (const log of makeLogs) {
            const bookId = log.args.bookId!
            const tick = BigInt(log.args.tick!)
            if (bookId === BOOK_ID && tick === TICK) {
              const orderIndex = log.args.orderIndex!
              const orderId = toOrderId(bookId, tick, orderIndex)
              const unit = BigInt(log.args.unit!)
              const blockNumber = log.blockNumber!
              orderIdToDepth[orderId.toString()] = {
                tick: Number(tick),
                bookId,
              }
              depth = depth + unit
              console.log(
                `[MAKE] Block: ${blockNumber}, Tx: ${log.transactionHash}, Unit: ${unit}, Depth: ${depth} (total)`,
              )
            }
          }

          const takeLogs = await publicClient.getLogs({
            address: '0xBc6eaFe723723DED3a411b6a1089a63bc5d73568',
            event: parseAbiItem(
              'event Take(uint192 indexed bookId, address indexed user, int24 tick, uint64 unit)',
            ),
            fromBlock: BigInt(i === START_BLOCK ? i : i + 1),
            toBlock: BigInt(Math.min(i + BATCH_SIZE, END_BLOCK)),
          })
          for (const log of takeLogs) {
            const bookId = log.args.bookId!
            const tick = BigInt(log.args.tick!)
            if (bookId === BOOK_ID && tick === TICK) {
              const unit = BigInt(log.args.unit!)
              const blockNumber = log.blockNumber!
              depth = depth - unit
              console.log(
                `[TAKE] Block: ${blockNumber}, Tx: ${log.transactionHash}, Unit: ${unit}, Depth: ${depth} (total)`,
              )
            }
          }