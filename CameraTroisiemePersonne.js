

var cameraTransform : Transform;
private var _target : Transform;



var distance = 7.0;


var height = 3.0;

var angularSmoothLag = 0.3;
var angularMaxSpeed = 15.0;

var heightSmoothLag = 0.3;

var snapSmoothLag = 0.2;
var snapMaxSpeed = 720.0;

var clampHeadPositionScreenSpace = 0.75;

var lockCameraTimeout = 0.2;

private var headOffset = Vector3.zero;
private var centerOffset = Vector3.zero;

private var heightVelocity = 0.0;
private var angleVelocity = 0.0;
private var snap = false;
private var controller : ThirdPersonController;
private var targetHeight = 100000.0; 

function Awake ()
{
	if(!cameraTransform && Camera.main)
		cameraTransform = Camera.main.transform;
	if(!cameraTransform) {
		Debug.Log("Please assign a camera to the ThirdPersonCamera script.");
		enabled = false;	
	}
			
		
	_target = transform;
	if (_target)
	{
		controller = _target.GetComponent(ThirdPersonController);
	}
	
	if (controller)
	{
		var characterController : CharacterController = _target.GetComponent.<Collider>();
		centerOffset = characterController.bounds.center - _target.position;
		headOffset = centerOffset;
		headOffset.y = characterController.bounds.max.y - _target.position.y;
	}
	else
		Debug.Log("Please assign a target to the camera that has a ThirdPersonController script attached.");

	
	Cut(_target, centerOffset);
}

function DebugDrawStuff ()
{
	Debug.DrawLine(_target.position, _target.position + headOffset);

}

function AngleDistance (a : float, b : float)
{
	a = Mathf.Repeat(a, 360);
	b = Mathf.Repeat(b, 360);
	
	return Mathf.Abs(b - a);
}

function Apply (dummyTarget : Transform, dummyCenter : Vector3)
{
	
	if (!controller)
		return;
	
	var targetCenter = _target.position + centerOffset;
	var targetHead = _target.position + headOffset;


	var originalTargetAngle = _target.eulerAngles.y;
	var currentAngle = cameraTransform.eulerAngles.y;

	
	var targetAngle = originalTargetAngle; 
	
	
	if (Input.GetButton("Fire2"))
		snap = true;
	
	if (snap)
	{
		
		if (AngleDistance (currentAngle, originalTargetAngle) < 3.0)
			snap = false;
		
		currentAngle = Mathf.SmoothDampAngle(currentAngle, targetAngle, angleVelocity, snapSmoothLag, snapMaxSpeed);
	}
	
	else
	{
		if (controller.GetLockCameraTimer () < lockCameraTimeout)
		{
			targetAngle = currentAngle;
		}

		
		if (AngleDistance (currentAngle, targetAngle) > 160 && controller.IsMovingBackwards ())
			targetAngle += 180;

		currentAngle = Mathf.SmoothDampAngle(currentAngle, targetAngle, angleVelocity, angularSmoothLag, angularMaxSpeed);
	}


	
	if (controller.IsJumping ())
	{
		
		var newTargetHeight = targetCenter.y + height;
		if (newTargetHeight < targetHeight || newTargetHeight - targetHeight > 5)
			targetHeight = targetCenter.y + height;
	}
	
	else
	{
		targetHeight = targetCenter.y + height;
	}

	
	var currentHeight = cameraTransform.position.y;
	currentHeight = Mathf.SmoothDamp (currentHeight, targetHeight, heightVelocity, heightSmoothLag);

	
	var currentRotation = Quaternion.Euler (0, currentAngle, 0);
	
	
	cameraTransform.position = targetCenter;
	cameraTransform.position += currentRotation * Vector3.back * distance;

	
	cameraTransform.position.y = currentHeight;
	
		
	SetUpRotation(targetCenter, targetHead);
}

function LateUpdate () {
	Apply (transform, Vector3.zero);
}

function Cut (dummyTarget : Transform, dummyCenter : Vector3)
{
	var oldHeightSmooth = heightSmoothLag;
	var oldSnapMaxSpeed = snapMaxSpeed;
	var oldSnapSmooth = snapSmoothLag;
	
	snapMaxSpeed = 10000;
	snapSmoothLag = 0.001;
	heightSmoothLag = 0.001;
	
	snap = true;
	Apply (transform, Vector3.zero);
	
	heightSmoothLag = oldHeightSmooth;
	snapMaxSpeed = oldSnapMaxSpeed;
	snapSmoothLag = oldSnapSmooth;
}

function SetUpRotation (centerPos : Vector3, headPos : Vector3)
{
	
	var cameraPos = cameraTransform.position;
	var offsetToCenter = centerPos - cameraPos;
	
	
	var yRotation = Quaternion.LookRotation(Vector3(offsetToCenter.x, 0, offsetToCenter.z));

	var relativeOffset = Vector3.forward * distance + Vector3.down * height;
	cameraTransform.rotation = yRotation * Quaternion.LookRotation(relativeOffset);

	
	var centerRay = cameraTransform.GetComponent.<Camera>().ViewportPointToRay(Vector3(.5, 0.5, 1));
	var topRay = cameraTransform.GetComponent.<Camera>().ViewportPointToRay(Vector3(.5, clampHeadPositionScreenSpace, 1));

	var centerRayPos = centerRay.GetPoint(distance);
	var topRayPos = topRay.GetPoint(distance);
	
	var centerToTopAngle = Vector3.Angle(centerRay.direction, topRay.direction);
	
	var heightToAngle = centerToTopAngle / (centerRayPos.y - topRayPos.y);

	var extraLookAngle = heightToAngle * (centerRayPos.y - centerPos.y);
	if (extraLookAngle < centerToTopAngle)
	{
		extraLookAngle = 0;
	}
	else
	{
		extraLookAngle = extraLookAngle - centerToTopAngle;
		cameraTransform.rotation *= Quaternion.Euler(-extraLookAngle, 0, 0);
	}
}

function GetCenterOffset ()
{
	return centerOffset;
}
