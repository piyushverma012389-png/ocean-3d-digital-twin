"""
API Router for in-situ ocean observations (SIH26067).
Serves active Argo profiling floats, CTD sensor profiles, and autonomous underwater gliders.
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.services.observation_service import observation_service
from app.models.schemas import ArgoFloatSummary, ArgoProfileResponse, GliderMission

router = APIRouter(prefix="/observations", tags=["In-Situ Observations"])

@router.get("/argo", response_model=List[ArgoFloatSummary])
def get_all_argo_floats():
    """
    Returns summary metadata for all active Argo profiling floats in the Indian Ocean basin.
    """
    return observation_service.get_all_floats()

@router.get("/argo/{float_id}/profile", response_model=ArgoProfileResponse)
def get_argo_profile(
    float_id: str,
    cycle: Optional[int] = Query(None, description="Specific ascent cycle number (defaults to latest)")
):
    """
    Returns vertical CTD sensor profile (Temperature and Salinity vs depth to 2000m) for specified Argo float and optional cycle.
    """
    profile = observation_service.get_float_profile(float_id, cycle=cycle)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Argo float '{float_id}' profile (cycle={cycle}) not found.")
    return profile

@router.get("/argo/{float_id}/cycles", response_model=List[int])
def get_argo_cycles(float_id: str):
    """
    Returns list of available ascent cycle numbers for specified Argo float.
    """
    cycles = observation_service.get_available_cycles(float_id)
    if not cycles:
        raise HTTPException(status_code=404, detail=f"No cycles found for Argo float '{float_id}'.")
    return cycles

@router.get("/gliders", response_model=List[GliderMission])
def get_glider_missions():
    """
    Returns active autonomous underwater glider missions with 3D sawtooth trajectories.
    """
    return observation_service.get_glider_missions()
