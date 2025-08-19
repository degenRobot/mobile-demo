const cancelLogs = await publicClient.getLogs({
    address: '0xBc6eaFe723723DED3a411b6a1089a63bc5d73568',
    event: parseAbiItem(
      'event Cancel(uint192 indexed orderId, uint64 unit)',
    ),
    fromBlock: BigInt(i === START_BLOCK ? i : i + 1),
    toBlock: BigInt(Math.min(i + BATCH_SIZE, END_BLOCK)),
  })
  for (const log of cancelLogs) {
    const orderId = log.args.orderId!
    const unit = BigInt(log.args.unit!)
    if (orderIdToDepth[orderId.toString()]) {
      const { tick, bookId } = orderIdToDepth[orderId.toString()]
      if (bookId === BOOK_ID && BigInt(tick) === TICK) {
        depth = depth - unit
        delete orderIdToDepth[orderId.toString()]
        console.log(
          `[CANCEL] Order ID: ${orderId}, Tx: ${log.transactionHash}, Unit: ${unit}, Depth: ${depth} (total)`,
        )
      }
    }
  }
} catch (e) {
  console.error(e)
} finally {
  queue.end(me)
}
})(),
)
}

await Promise.allSettled(p)
}

main()