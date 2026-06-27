#![no_std]
#[macro_use]
extern crate alloc;

use alloc::string::{String, ToString};
use alloc::vec::Vec;
use casper_contract::contract_api::{account, runtime, storage, system};
use casper_contract::unwrap_or_revert::UnwrapOrRevert;
use casper_types::{
    account::AccountHash,
    addressable_entity::{
        EntityEntryPoint, EntryPointAccess, EntryPointPayment, EntryPointType, EntryPoints,
        Parameter,
    },
    bytesrepr::{FromBytes, ToBytes},
    contracts::NamedKeys,
    ApiError, CLType, CLTyped, CLValue, Key, PublicKey, URef, U512,
};

const OWNER: &str = "owner";
const FEE_RECIPIENT: &str = "fee_recipient";
const MINIMUM_STAKE: &str = "minimum_stake";
const CONTRACT_PURSE: &str = "contract_purse";
const PROVIDERS_STATUS: &str = "providers_status";
const PROVIDERS_PEER_ID: &str = "providers_peer_id";
const PROVIDERS_NAME: &str = "providers_name";
const PROVIDERS_TASK_TYPES: &str = "providers_task_types";
const PROVIDERS_REGISTERED_AT: &str = "providers_registered_at";
const PROVIDERS_UPDATED_AT: &str = "providers_updated_at";
const STAKES: &str = "stakes";
const PEER_ID_TO_PROVIDER: &str = "peer_id_to_provider";
const PROVIDERS_LIST: &str = "providers_list";

const PROVIDERS_CAPACITY: &str = "providers_capacity";
const PROVIDERS_MODELS: &str = "providers_models";
const PROVIDERS_GPU: &str = "providers_gpu";
const PROVIDERS_VRAM: &str = "providers_vram";
const PROVIDERS_RAM: &str = "providers_ram";
const PROVIDERS_CPU_CORES: &str = "providers_cpu_cores";
const PROVIDERS_BANDWIDTH: &str = "providers_bandwidth";
const PROVIDERS_SERVICE_TYPE: &str = "providers_service_type";
const PROVIDERS_OR_PORT: &str = "providers_or_port";
const PROVIDERS_DIR_PORT: &str = "providers_dir_port";

const STATUS_UNREGISTERED: u8 = 0;
const STATUS_ACTIVE: u8 = 1;
const STATUS_PAUSED: u8 = 2;
const STATUS_SLASHED: u8 = 3;

fn get_dict(name: &str) -> URef {
    runtime::get_key(name)
        .unwrap_or_revert_with(ApiError::MissingKey)
        .into_uref()
        .unwrap_or_revert()
}

fn get_or_create_contract_purse() -> URef {
    match runtime::get_key(CONTRACT_PURSE) {
        Some(key) => key.into_uref().unwrap_or_revert(),
        None => {
            let purse = system::create_purse();
            runtime::put_key(CONTRACT_PURSE, purse.into());
            purse
        }
    }
}

fn read_dict<T: CLTyped + FromBytes>(dict: URef, key: &str) -> Option<T> {
    storage::dictionary_get(dict, key).unwrap_or_revert()
}

fn write_dict<T: CLTyped + ToBytes>(dict: URef, key: &str, value: T) {
    storage::dictionary_put(dict, key, value);
}

fn provider_exists(account: &AccountHash) -> bool {
    read_dict::<u8>(get_dict(PROVIDERS_STATUS), &account.to_string()).is_some()
}

fn is_active(account: &AccountHash) -> bool {
    read_dict::<u8>(get_dict(PROVIDERS_STATUS), &account.to_string()) == Some(STATUS_ACTIVE)
}

fn require_owner() {
    let owner: AccountHash = runtime::get_key(OWNER)
        .unwrap_or_revert()
        .into_account()
        .unwrap_or_revert();
    if runtime::get_caller() != owner {
        runtime::revert(ApiError::User(10));
    }
}

fn create_entry_points() -> EntryPoints {
    let mut eps = EntryPoints::new();

    eps.add_entry_point(EntityEntryPoint::new(
        "register_provider",
        vec![
            Parameter::new("qvac_peer_id", CLType::String),
            Parameter::new("name", CLType::String),
            Parameter::new("task_types", CLType::U32),
            Parameter::new("stake_amount", U512::cl_type()),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    eps.add_entry_point(EntityEntryPoint::new(
        "update_provider",
        vec![
            Parameter::new("name", CLType::String),
            Parameter::new("task_types", CLType::U32),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    eps.add_entry_point(EntityEntryPoint::new(
        "update_provider_capacity",
        vec![
            Parameter::new("resource_type", CLType::String),
            Parameter::new("total_capacity_mb", CLType::U64),
            Parameter::new("cpu_cores", CLType::U64),
            Parameter::new("ram_mb", CLType::U64),
            Parameter::new("gpu", CLType::Bool),
            Parameter::new("vram_mb", CLType::U64),
            Parameter::new("models", CLType::String),
            Parameter::new("bandwidth_mbps", CLType::U64),
            Parameter::new("service_type", CLType::String),
            Parameter::new("or_port", CLType::U64),
            Parameter::new("dir_port", CLType::U64),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    eps.add_entry_point(EntityEntryPoint::new(
        "rate_consumer",
        vec![
            Parameter::new("consumer", PublicKey::cl_type()),
            Parameter::new("rating", CLType::U64),
            Parameter::new("job_id", CLType::String),
            Parameter::new("file_id", CLType::String),
            Parameter::new("agreement_id", CLType::String),
            Parameter::new("session_id", CLType::String),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    eps.add_entry_point(EntityEntryPoint::new(
        "submit_evidence",
        vec![
            Parameter::new("job_id", CLType::String),
            Parameter::new("file_id", CLType::String),
            Parameter::new("agreement_id", CLType::String),
            Parameter::new("session_id", CLType::String),
            Parameter::new("evidence_hash", CLType::String),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    eps.add_entry_point(EntityEntryPoint::new(
        "set_protocol_fee_bps",
        vec![Parameter::new("fee_bps", CLType::U64)],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    eps.add_entry_point(EntityEntryPoint::new(
        "issue_challenge",
        vec![
            Parameter::new("file_id", CLType::String),
            Parameter::new("challenge_hash", CLType::String),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    eps.add_entry_point(EntityEntryPoint::new(
        "verify_challenge",
        vec![
            Parameter::new("challenge_id", CLType::String),
            Parameter::new("passed", CLType::Bool),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    eps.add_entry_point(EntityEntryPoint::new(
        "resolve_dispute",
        vec![
            Parameter::new("job_id", CLType::String),
            Parameter::new("session_id", CLType::String),
            Parameter::new("file_id", CLType::String),
            Parameter::new("agreement_id", CLType::String),
            Parameter::new("consumer_pct", CLType::U64),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    eps.add_entry_point(EntityEntryPoint::new(
        "submit_kleros_verdict",
        vec![
            Parameter::new("job_id", CLType::String),
            Parameter::new("file_id", CLType::String),
            Parameter::new("agreement_id", CLType::String),
            Parameter::new("session_id", CLType::String),
            Parameter::new("kleros_dispute_id", CLType::U64),
            Parameter::new("ruling", CLType::U64),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    eps.add_entry_point(EntityEntryPoint::new(
        "pause_provider",
        vec![],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    eps.add_entry_point(EntityEntryPoint::new(
        "resume_provider",
        vec![],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    eps.add_entry_point(EntityEntryPoint::new(
        "slash_provider",
        vec![Parameter::new("provider_address", AccountHash::cl_type())],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    eps.add_entry_point(EntityEntryPoint::new(
        "deposit_stake",
        vec![
            Parameter::new("amount", U512::cl_type()),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    eps.add_entry_point(EntityEntryPoint::new(
        "withdraw_stake",
        vec![
            Parameter::new("amount", U512::cl_type()),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    eps.add_entry_point(EntityEntryPoint::new(
        "get_provider_status",
        vec![Parameter::new("provider_address", AccountHash::cl_type())],
        CLType::U8,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    eps.add_entry_point(EntityEntryPoint::new(
        "is_active_provider",
        vec![Parameter::new("provider_address", AccountHash::cl_type())],
        CLType::Bool,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    eps.add_entry_point(EntityEntryPoint::new(
        "minimum_stake",
        vec![],
        U512::cl_type(),
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    eps.add_entry_point(EntityEntryPoint::new(
        "get_providers",
        vec![],
        CLType::String,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    eps.add_entry_point(EntityEntryPoint::new(
        "get_provider",
        vec![Parameter::new("provider_address", AccountHash::cl_type())],
        CLType::String,
        EntryPointAccess::Public,
        EntryPointType::Called,
        EntryPointPayment::Caller,
    ));

    eps
}

#[no_mangle]
pub extern "C" fn register_provider() {
    let caller = runtime::get_caller();
    let caller_str = caller.to_string();

    let qvac_peer_id: String = runtime::get_named_arg("qvac_peer_id");
    let name: String = runtime::get_named_arg("name");
    let task_types: u32 = runtime::get_named_arg("task_types");
    let stake_amount: U512 = runtime::get_named_arg("stake_amount");

    if provider_exists(&caller) {
        runtime::revert(ApiError::User(1));
    }

    let min_stake: U512 = storage::read(get_dict(MINIMUM_STAKE))
        .unwrap_or_revert()
        .unwrap_or_revert();
    if stake_amount < min_stake {
        runtime::revert(ApiError::User(2));
    }

    let now: u64 = Into::<u64>::into(runtime::get_blocktime());

    write_dict(get_dict(PROVIDERS_STATUS), &caller_str, STATUS_ACTIVE);
    write_dict(get_dict(PROVIDERS_PEER_ID), &caller_str, qvac_peer_id.clone());
    write_dict(get_dict(PROVIDERS_NAME), &caller_str, name);
    write_dict(get_dict(PROVIDERS_TASK_TYPES), &caller_str, task_types);
    write_dict(get_dict(PROVIDERS_REGISTERED_AT), &caller_str, now);
    write_dict(get_dict(PROVIDERS_UPDATED_AT), &caller_str, now);
    write_dict(get_dict(STAKES), &caller_str, stake_amount.clone());
    write_dict(get_dict(PEER_ID_TO_PROVIDER), &qvac_peer_id, caller);

    let mut providers: Vec<AccountHash> = read_dict(get_dict(PROVIDERS_LIST), "list").unwrap_or_default();
    providers.push(caller);
    write_dict(get_dict(PROVIDERS_LIST), "list", providers);
}

#[no_mangle]
pub extern "C" fn update_provider() {
    let caller = runtime::get_caller();
    let caller_str = caller.to_string();
    if !provider_exists(&caller) {
        runtime::revert(ApiError::User(3));
    }
    let name: String = runtime::get_named_arg("name");
    let task_types: u32 = runtime::get_named_arg("task_types");
    let now: u64 = Into::<u64>::into(runtime::get_blocktime());
    write_dict(get_dict(PROVIDERS_NAME), &caller_str, name);
    write_dict(get_dict(PROVIDERS_TASK_TYPES), &caller_str, task_types);
    write_dict(get_dict(PROVIDERS_UPDATED_AT), &caller_str, now);
}

#[no_mangle]
pub extern "C" fn update_provider_capacity() {
    let caller = runtime::get_caller();
    let caller_str = caller.to_string();
    if !provider_exists(&caller) {
        runtime::revert(ApiError::User(3));
    }

    let resource_type: String = runtime::get_named_arg("resource_type");
    let now: u64 = Into::<u64>::into(runtime::get_blocktime());

    if resource_type == "storage" {
        let total_capacity_mb: u64 = runtime::get_named_arg("total_capacity_mb");
        write_dict(get_dict(PROVIDERS_CAPACITY), &caller_str, total_capacity_mb);
    } else if resource_type == "compute" {
        let cpu_cores: u64 = runtime::get_named_arg("cpu_cores");
        let ram_mb: u64 = runtime::get_named_arg("ram_mb");
        let gpu: bool = runtime::get_named_arg("gpu");
        let vram_mb: u64 = runtime::get_named_arg("vram_mb");
        write_dict(get_dict(PROVIDERS_CPU_CORES), &caller_str, cpu_cores);
        write_dict(get_dict(PROVIDERS_RAM), &caller_str, ram_mb);
        write_dict(get_dict(PROVIDERS_GPU), &caller_str, gpu);
        write_dict(get_dict(PROVIDERS_VRAM), &caller_str, vram_mb);
    } else if resource_type == "inference" {
        let models: String = runtime::get_named_arg("models");
        let gpu: bool = runtime::get_named_arg("gpu");
        let vram_mb: u64 = runtime::get_named_arg("vram_mb");
        write_dict(get_dict(PROVIDERS_MODELS), &caller_str, models);
        write_dict(get_dict(PROVIDERS_GPU), &caller_str, gpu);
        write_dict(get_dict(PROVIDERS_VRAM), &caller_str, vram_mb);
    } else if resource_type == "bandwidth" {
        let bandwidth_mbps: u64 = runtime::get_named_arg("bandwidth_mbps");
        let service_type: String = runtime::get_named_arg("service_type");
        let or_port: u64 = runtime::get_named_arg("or_port");
        let dir_port: u64 = runtime::get_named_arg("dir_port");
        write_dict(get_dict(PROVIDERS_BANDWIDTH), &caller_str, bandwidth_mbps);
        write_dict(get_dict(PROVIDERS_SERVICE_TYPE), &caller_str, service_type);
        write_dict(get_dict(PROVIDERS_OR_PORT), &caller_str, or_port);
        write_dict(get_dict(PROVIDERS_DIR_PORT), &caller_str, dir_port);
    } else {
        runtime::revert(ApiError::User(6));
    }

    write_dict(get_dict(PROVIDERS_UPDATED_AT), &caller_str, now);
}

#[no_mangle]
pub extern "C" fn rate_consumer() {
    let caller = runtime::get_caller();
    let consumer_pk: PublicKey = runtime::get_named_arg("consumer");
    let consumer = consumer_pk.to_account_hash();
    let rating: u64 = runtime::get_named_arg("rating");
    let k = consumer.to_string();

    let count: u64 = read_dict(get_dict("consumer_rating_count"), &k).unwrap_or(0);
    let total: u64 = read_dict(get_dict("consumer_rating_total"), &k).unwrap_or(0);
    write_dict(get_dict("consumer_rating_count"), &k, count + 1);
    write_dict(get_dict("consumer_rating_total"), &k, total + rating);
    write_dict(get_dict("consumer_last_rating"), &k, rating);
    write_dict(get_dict("consumer_rated_by"), &k, caller);

    let job_id: String = runtime::get_named_arg("job_id");
    let file_id: String = runtime::get_named_arg("file_id");
    let agreement_id: String = runtime::get_named_arg("agreement_id");
    let session_id: String = runtime::get_named_arg("session_id");
    let ref_id = if !job_id.is_empty() { job_id }
        else if !file_id.is_empty() { file_id }
        else if !agreement_id.is_empty() { agreement_id }
        else { session_id };
    write_dict(get_dict("consumer_last_ref"), &k, ref_id);
}

#[no_mangle]
pub extern "C" fn submit_evidence() {
    let caller = runtime::get_caller();
    let evidence_hash: String = runtime::get_named_arg("evidence_hash");
    let job_id: String = runtime::get_named_arg("job_id");
    let file_id: String = runtime::get_named_arg("file_id");
    let agreement_id: String = runtime::get_named_arg("agreement_id");
    let session_id: String = runtime::get_named_arg("session_id");

    let ref_id = if !job_id.is_empty() { job_id }
        else if !file_id.is_empty() { file_id }
        else if !agreement_id.is_empty() { agreement_id }
        else { session_id };

    let caller_str = caller.to_string();
    write_dict(get_dict("provider_evidence"), &format!("{}:{}", caller_str, ref_id), evidence_hash);
    write_dict(get_dict("provider_evidence_at"), &format!("{}:{}", caller_str, ref_id), Into::<u64>::into(runtime::get_blocktime()));
}

#[no_mangle]
pub extern "C" fn set_protocol_fee_bps() {
    require_owner();
    let fee_bps: u64 = runtime::get_named_arg("fee_bps");
    if fee_bps > 10000 {
        runtime::revert(ApiError::User(1));
    }
    let fee_uref = runtime::get_key("protocol_fee_bps_value")
        .unwrap_or_revert()
        .into_uref()
        .unwrap_or_revert();
    storage::write(fee_uref, fee_bps);
}

#[no_mangle]
pub extern "C" fn issue_challenge() {
    require_owner();
    let file_id: String = runtime::get_named_arg("file_id");
    let challenge_hash: String = runtime::get_named_arg("challenge_hash");
    let now: u64 = Into::<u64>::into(runtime::get_blocktime());
    let challenge_id = format!("challenge:{}:{}", file_id, now);
    write_dict(get_dict("challenges"), &format!("{}:file_id", challenge_id), file_id);
    write_dict(get_dict("challenges"), &format!("{}:challenge_hash", challenge_id), challenge_hash);
    write_dict(get_dict("challenges"), &format!("{}:issued_at", challenge_id), now);
    write_dict(get_dict("challenges"), &format!("{}:status", challenge_id), "pending");
}

#[no_mangle]
pub extern "C" fn verify_challenge() {
    require_owner();
    let challenge_id: String = runtime::get_named_arg("challenge_id");
    let passed: bool = runtime::get_named_arg("passed");
    let status: String = read_dict(get_dict("challenges"), &format!("{}:status", challenge_id)).unwrap_or_default();
    if status != "pending" {
        runtime::revert(ApiError::User(4));
    }
    write_dict(get_dict("challenges"), &format!("{}:status", challenge_id), if passed { "passed" } else { "failed" });
    write_dict(get_dict("challenges"), &format!("{}:verified_at", challenge_id), Into::<u64>::into(runtime::get_blocktime()));
}

#[no_mangle]
pub extern "C" fn resolve_dispute() {
    require_owner();
    let consumer_pct: u64 = runtime::get_named_arg("consumer_pct");
    let job_id: String = runtime::get_named_arg("job_id");
    let session_id: String = runtime::get_named_arg("session_id");
    let file_id: String = runtime::get_named_arg("file_id");
    let agreement_id: String = runtime::get_named_arg("agreement_id");

    let ref_id = if !job_id.is_empty() { job_id }
        else if !file_id.is_empty() { file_id }
        else if !agreement_id.is_empty() { agreement_id }
        else { session_id };

    write_dict(get_dict("dispute_resolutions"), &format!("{}:consumer_pct", ref_id), consumer_pct);
    write_dict(get_dict("dispute_resolutions"), &format!("{}:resolved_at", ref_id), Into::<u64>::into(runtime::get_blocktime()));
    write_dict(get_dict("dispute_resolutions"), &format!("{}:status", ref_id), if consumer_pct > 50 { "consumer_won" } else { "provider_won" });
}

#[no_mangle]
pub extern "C" fn submit_kleros_verdict() {
    let kleros_dispute_id: u64 = runtime::get_named_arg("kleros_dispute_id");
    let ruling: u64 = runtime::get_named_arg("ruling");
    let job_id: String = runtime::get_named_arg("job_id");
    let file_id: String = runtime::get_named_arg("file_id");
    let agreement_id: String = runtime::get_named_arg("agreement_id");
    let session_id: String = runtime::get_named_arg("session_id");

    let ref_id = if !job_id.is_empty() { job_id }
        else if !file_id.is_empty() { file_id }
        else if !agreement_id.is_empty() { agreement_id }
        else { session_id };

    write_dict(get_dict("kleros_verdicts"), &format!("{}:dispute_id", ref_id), kleros_dispute_id);
    write_dict(get_dict("kleros_verdicts"), &format!("{}:ruling", ref_id), ruling);
    write_dict(get_dict("kleros_verdicts"), &format!("{}:verdict_at", ref_id), Into::<u64>::into(runtime::get_blocktime()));

    if ruling == 1 {
        write_dict(get_dict("kleros_verdicts"), &format!("{}:winner", ref_id), "consumer");
    } else if ruling == 2 {
        write_dict(get_dict("kleros_verdicts"), &format!("{}:winner", ref_id), "provider");
    } else {
        write_dict(get_dict("kleros_verdicts"), &format!("{}:winner", ref_id), "split");
    }
}

#[no_mangle]
pub extern "C" fn pause_provider() {
    let caller = runtime::get_caller();
    let caller_str = caller.to_string();
    if !provider_exists(&caller) {
        runtime::revert(ApiError::User(3));
    }
    write_dict(get_dict(PROVIDERS_STATUS), &caller_str, STATUS_PAUSED);
}

#[no_mangle]
pub extern "C" fn resume_provider() {
    let caller = runtime::get_caller();
    let caller_str = caller.to_string();
    if !provider_exists(&caller) {
        runtime::revert(ApiError::User(3));
    }
    write_dict(get_dict(PROVIDERS_STATUS), &caller_str, STATUS_ACTIVE);
}

#[no_mangle]
pub extern "C" fn slash_provider() {
    require_owner();
    let provider: AccountHash = runtime::get_named_arg("provider_address");
    write_dict(get_dict(PROVIDERS_STATUS), &provider.to_string(), STATUS_SLASHED);
}

#[no_mangle]
pub extern "C" fn deposit_stake() {
    let caller = runtime::get_caller();
    let caller_str = caller.to_string();
    if !provider_exists(&caller) {
        runtime::revert(ApiError::User(3));
    }
    let amount: U512 = runtime::get_named_arg("amount");
    let current: U512 = read_dict(get_dict(STAKES), &caller_str).unwrap_or_default();
    write_dict(get_dict(STAKES), &caller_str, current + amount);
}

#[no_mangle]
pub extern "C" fn withdraw_stake() {
    let caller = runtime::get_caller();
    let caller_str = caller.to_string();
    if !provider_exists(&caller) {
        runtime::revert(ApiError::User(3));
    }
    let amount: U512 = runtime::get_named_arg("amount");
    let current: U512 = read_dict(get_dict(STAKES), &caller_str).unwrap_or_default();
    if amount > current {
        runtime::revert(ApiError::User(4));
    }
    let min_stake: U512 = storage::read(get_dict(MINIMUM_STAKE))
        .unwrap_or_revert()
        .unwrap_or_revert();
    let remaining = current - amount;
    if remaining < min_stake && remaining != U512::from(0) {
        runtime::revert(ApiError::User(5));
    }
    write_dict(get_dict(STAKES), &caller_str, remaining);
}

#[no_mangle]
pub extern "C" fn get_provider_status() {
    let provider: AccountHash = runtime::get_named_arg("provider_address");
    let status = read_dict::<u8>(get_dict(PROVIDERS_STATUS), &provider.to_string())
        .unwrap_or(STATUS_UNREGISTERED);
    runtime::ret(CLValue::from_t(status).unwrap_or_revert());
}

#[no_mangle]
pub extern "C" fn is_active_provider() {
    let provider: AccountHash = runtime::get_named_arg("provider_address");
    let active = is_active(&provider);
    runtime::ret(CLValue::from_t(active).unwrap_or_revert());
}

#[no_mangle]
pub extern "C" fn minimum_stake() {
    let value: U512 = storage::read(get_dict(MINIMUM_STAKE))
        .unwrap_or_revert()
        .unwrap_or_revert();
    runtime::ret(CLValue::from_t(value).unwrap_or_revert());
}

#[no_mangle]
pub extern "C" fn get_providers() {
    let providers: Vec<AccountHash> = read_dict(get_dict(PROVIDERS_LIST), "list")
        .unwrap_or_default();
    let result = providers.iter().map(|p| p.to_string()).collect::<Vec<String>>().join(",");
    runtime::ret(CLValue::from_t(result).unwrap_or_revert());
}

#[no_mangle]
pub extern "C" fn get_provider() {
    let provider: AccountHash = runtime::get_named_arg("provider_address");
    let provider_str = provider.to_string();
    let jobs_dict = get_dict(PROVIDERS_STATUS);

    if !provider_exists(&provider) {
        runtime::ret(CLValue::from_t("not_found").unwrap_or_revert());
        return;
    }

    let status: u8 = read_dict(jobs_dict, &provider_str).unwrap_or(STATUS_UNREGISTERED);
    let peer_id: String = read_dict(get_dict(PROVIDERS_PEER_ID), &provider_str).unwrap_or_default();
    let name: String = read_dict(get_dict(PROVIDERS_NAME), &provider_str).unwrap_or_default();
    let task_types: u32 = read_dict(get_dict(PROVIDERS_TASK_TYPES), &provider_str).unwrap_or_default();
    let stake: U512 = read_dict(get_dict(STAKES), &provider_str).unwrap_or_default();
    let registered_at: u64 = read_dict(get_dict(PROVIDERS_REGISTERED_AT), &provider_str).unwrap_or_default();

    let status_str = match status {
        0 => "unregistered",
        1 => "active",
        2 => "paused",
        3 => "slashed",
        _ => "unknown",
    };

    let result = format!(
        "address={}&status={}&peer_id={}&name={}&task_types={}&stake={}&registered_at={}",
        provider_str, status_str, peer_id, name, task_types, stake.to_string(), registered_at,
    );
    runtime::ret(CLValue::from_t(result).unwrap_or_revert());
}

#[no_mangle]
pub extern "C" fn call() {
    let owner: AccountHash = runtime::get_named_arg("owner");
    let fee_recipient: AccountHash = runtime::get_named_arg("fee_recipient");
    let minimum_stake: U512 = runtime::get_named_arg("minimum_stake");

    let mut named_keys = NamedKeys::new();
    named_keys.insert(OWNER.to_string(), Key::Account(owner));
    named_keys.insert(FEE_RECIPIENT.to_string(), Key::Account(fee_recipient));
    named_keys.insert(MINIMUM_STAKE.to_string(), storage::new_uref(minimum_stake).into());

    let dict_keys = [
        "providers_status",
        "providers_peer_id",
        "providers_name",
        "providers_task_types",
        "providers_registered_at",
        "providers_updated_at",
        "stakes",
        "peer_id_to_provider",
        "providers_capacity",
        "providers_models",
        "providers_gpu",
        "providers_vram",
        "providers_ram",
        "providers_cpu_cores",
        "providers_bandwidth",
        "providers_service_type",
        "providers_or_port",
        "providers_dir_port",
        "consumer_rating_count",
        "consumer_rating_total",
        "consumer_last_rating",
        "consumer_rated_by",
        "consumer_last_ref",
        "provider_evidence",
        "provider_evidence_at",
        "challenges",
        "dispute_resolutions",
        "kleros_verdicts",
        "compute_registry",
        "compute_registry_hash",
        "compute_registry_package",
        "owner",
        "fee_recipient",
        "minimum_stake",
        "contract_purse",
        "protocol_fee_bps_value",
    ];
    for key in dict_keys.iter() {
        if runtime::has_key(key) {
            runtime::remove_key(key);
        }
    }

    named_keys.insert(PROVIDERS_STATUS.to_string(), storage::new_dictionary("cr6_providers_status").unwrap_or_revert().into());
    named_keys.insert(PROVIDERS_PEER_ID.to_string(), storage::new_dictionary("cr6_providers_peer_id").unwrap_or_revert().into());
    named_keys.insert(PROVIDERS_NAME.to_string(), storage::new_dictionary("cr6_providers_name").unwrap_or_revert().into());
    named_keys.insert(PROVIDERS_TASK_TYPES.to_string(), storage::new_dictionary("cr6_providers_task_types").unwrap_or_revert().into());
    named_keys.insert(PROVIDERS_REGISTERED_AT.to_string(), storage::new_dictionary("cr6_providers_registered_at").unwrap_or_revert().into());
    named_keys.insert(PROVIDERS_UPDATED_AT.to_string(), storage::new_dictionary("cr6_providers_updated_at").unwrap_or_revert().into());
    named_keys.insert(STAKES.to_string(), storage::new_dictionary("cr6_stakes").unwrap_or_revert().into());
    named_keys.insert(PEER_ID_TO_PROVIDER.to_string(), storage::new_dictionary("cr6_peer_id_to_provider").unwrap_or_revert().into());
    named_keys.insert(PROVIDERS_LIST.to_string(), storage::new_dictionary("cr6_providers_list").unwrap_or_revert().into());
    named_keys.insert(PROVIDERS_CAPACITY.to_string(), storage::new_dictionary("cr6_providers_capacity").unwrap_or_revert().into());
    named_keys.insert(PROVIDERS_MODELS.to_string(), storage::new_dictionary("cr6_providers_models").unwrap_or_revert().into());
    named_keys.insert(PROVIDERS_GPU.to_string(), storage::new_dictionary("cr6_providers_gpu").unwrap_or_revert().into());
    named_keys.insert(PROVIDERS_VRAM.to_string(), storage::new_dictionary("cr6_providers_vram").unwrap_or_revert().into());
    named_keys.insert(PROVIDERS_RAM.to_string(), storage::new_dictionary("cr6_providers_ram").unwrap_or_revert().into());
    named_keys.insert(PROVIDERS_CPU_CORES.to_string(), storage::new_dictionary("cr6_providers_cpu_cores").unwrap_or_revert().into());
    named_keys.insert(PROVIDERS_BANDWIDTH.to_string(), storage::new_dictionary("cr6_providers_bandwidth").unwrap_or_revert().into());
    named_keys.insert(PROVIDERS_SERVICE_TYPE.to_string(), storage::new_dictionary("cr6_providers_service_type").unwrap_or_revert().into());
    named_keys.insert(PROVIDERS_OR_PORT.to_string(), storage::new_dictionary("cr6_providers_or_port").unwrap_or_revert().into());
    named_keys.insert(PROVIDERS_DIR_PORT.to_string(), storage::new_dictionary("cr6_providers_dir_port").unwrap_or_revert().into());
    named_keys.insert("consumer_rating_count".to_string(), storage::new_dictionary("cr6_consumer_rating_count").unwrap_or_revert().into());
    named_keys.insert("consumer_rating_total".to_string(), storage::new_dictionary("cr6_consumer_rating_total").unwrap_or_revert().into());
    named_keys.insert("consumer_last_rating".to_string(), storage::new_dictionary("cr6_consumer_last_rating").unwrap_or_revert().into());
    named_keys.insert("consumer_rated_by".to_string(), storage::new_dictionary("cr6_consumer_rated_by").unwrap_or_revert().into());
    named_keys.insert("consumer_last_ref".to_string(), storage::new_dictionary("cr6_consumer_last_ref").unwrap_or_revert().into());
    named_keys.insert("provider_evidence".to_string(), storage::new_dictionary("cr6_provider_evidence").unwrap_or_revert().into());
    named_keys.insert("provider_evidence_at".to_string(), storage::new_dictionary("cr6_provider_evidence_at").unwrap_or_revert().into());
    named_keys.insert("challenges".to_string(), storage::new_dictionary("cr6_challenges").unwrap_or_revert().into());
    named_keys.insert("dispute_resolutions".to_string(), storage::new_dictionary("cr6_dispute_resolutions").unwrap_or_revert().into());
    named_keys.insert("kleros_verdicts".to_string(), storage::new_dictionary("cr6_kleros_verdicts").unwrap_or_revert().into());
    named_keys.insert("protocol_fee_bps_value".to_string(), storage::new_uref(0u64).into());

    let (contract_hash, _) = storage::new_contract(
        create_entry_points(),
        Some(named_keys),
        Some("compute_registry_v6".to_string()),
        Some("compute_registry_v6_hash".to_string()),
        None,
    );
    runtime::put_key("compute_registry_v6_hash", contract_hash.into());
}
