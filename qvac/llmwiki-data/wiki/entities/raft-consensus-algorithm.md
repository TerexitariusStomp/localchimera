---
title: Raft Consensus Algorithm
description: QVAC-generated wiki page about raft consensus algorithm
date: 2026-06-16
tags: ["raft", "consensus", "algorithm"]
---

## raft consensus algorithm

### What is raft consensus algorithm?

Raft consensus algorithm is an algorithm used to manage consensus in multi-agent systems. It ensures that a group of agents agrees on a value. In a multi-agent system, each agent has a unique state, and a consensus algorithm is used to agree on a value among the agents.

### How does raft consensus algorithm work?

The consensus algorithm works as follows:

1. Each agent is assigned a leader and a set of agents to follow.
2. The leader announces the value of the first agent as the current state.
3. All agents that follow the leader announce their state.
4. The set of agents who have followed the leader are considered the consensus set.