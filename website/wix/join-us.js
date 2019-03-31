import { countriesOptions } from 'public/countries';

const services = {
	CR: 'Content Reporting',
	TE: 'Track Editing',
	SE: 'Sound Engineering',
	FC: 'Fidelity Checking'
};

const languages = ['English', 'Hindi', 'Bengali'];

// const validateServices = (value, reject) => {
// 	const checked = Object.keys(services).filter(service => $w(`#${service}`).checked);
// 	console.log(checked);
// 	if (checked.length === 0)
// 		reject("Select any service, please.");
// }

$w.onReady(function() {
	$w('#SE').onChange(event => {
		$w('#experience').required = event.target.checked;
	});
	$w('#country').options = countriesOptions();
	$w('#whatsApp').onChange(event => {
		$w('#contactPhoneNumber').required = event.target.checked;
	});
	$w('#influencer').onChange(event => {
		console.log(event);
		const personalInfluencers = [
			'From a preacher',
			'From another devotee who is doing the service',
			'From a friend'
		];
		$w('#recommendedBy').required = personalInfluencers.indexOf(event.target.value) > -1;
	});

	// Object.keys(services).forEach(service => {
	// 	$w(`#${service}`).onCustomValidation(validateServices);
	// });

	const dataset = $w('#registrationsDataset');

	dataset.onBeforeSave(() => {
		dataset.setFieldValues({
			seva: Object.keys(services).reduce((result, service) => {
				if ($w(`#${service}`).checked) result.push(services[service]);
				return result;
			}, []),
			languages: languages.reduce((result, language) => {
				if ($w(`#${language}`).checked) result.push(language);
				return result;
			}, [])
		});

		if (dataset.getCurrentItem().seva.length === 0)
			return Promise.reject('Please select any Seva option.');

		if (dataset.getCurrentItem().languages.length === 0)
			return Promise.reject('Please select languages you speak.');
	});

	dataset.onAfterSave(() => {
		Object.keys(services).forEach(service => {
			$w(`#${service}`).cheched = false;
		});

		languages.forEach(language => {
			$w(`#${language}`).cheched = false;
		});
	});

	dataset.onError((operation, error) => {
		$w('#validationMessages').text = error.message.replace(
			'Operation cancelled by user code. ',
			''
		);
	});
});
