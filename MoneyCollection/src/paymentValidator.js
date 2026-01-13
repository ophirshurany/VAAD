require('dotenv').config();

/**
 * Fixed monthly payment amount from configuration.
 * Defaults to 400 ILS if not specified.
 */
const FIXED_AMOUNT = parseInt(process.env.FIXED_PAYMENT_AMOUNT) || 400;

/**
 * Validates a payment amount against the fixed monthly rate.
 * @param {number} amount - The payment amount to validate.
 * @returns {Object} - Validation result with flags and calculated values.
 */
function validatePayment(amount) {
    const numAmount = parseFloat(amount) || 0;

    return {
        amount: numAmount,
        fixedAmount: FIXED_AMOUNT,
        isExact: numAmount === FIXED_AMOUNT,
        isUnderpayment: numAmount < FIXED_AMOUNT && numAmount > 0,
        isOverpayment: numAmount > FIXED_AMOUNT,
        monthsCovered: Math.floor(numAmount / FIXED_AMOUNT),
        remainder: numAmount % FIXED_AMOUNT,
        shortfall: numAmount < FIXED_AMOUNT ? FIXED_AMOUNT - numAmount : 0
    };
}

/**
 * Calculates which months should be covered by an overpayment.
 * Covers current month first, then goes back to previous unpaid months.
 * @param {Date} paymentDate - The date of the payment.
 * @param {number} monthsCovered - Number of months the payment covers.
 * @param {Array} unpaidMonths - List of unpaid month identifiers (e.g., ['ינואר 2026', 'דצמבר 2025']).
 * @returns {Array} - List of months to mark as paid.
 */
function calculateCoveredMonths(paymentDate, monthsCovered, unpaidMonths = []) {
    const hebrewMonths = [
        'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
        'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];

    const date = new Date(paymentDate);
    const currentMonth = hebrewMonths[date.getMonth()];
    const currentYear = date.getFullYear();
    const currentMonthLabel = `${currentMonth} ${currentYear}`;

    // Start with current month
    const coveredMonths = [currentMonthLabel];

    // If more than one month covered, add previous unpaid months
    if (monthsCovered > 1 && unpaidMonths.length > 0) {
        // Sort unpaid months by date (most recent first)
        // Add unpaid months until we reach the coverage limit
        for (const unpaidMonth of unpaidMonths) {
            if (coveredMonths.length >= monthsCovered) break;
            if (unpaidMonth !== currentMonthLabel) {
                coveredMonths.push(unpaidMonth);
            }
        }
    }

    return coveredMonths;
}

/**
 * Gets the Hebrew month label for a given date.
 * @param {Date|string} date - The date to convert.
 * @returns {string} - Hebrew month label (e.g., 'ינואר 2026').
 */
function getHebrewMonthLabel(date) {
    const hebrewMonths = [
        'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
        'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];

    const d = new Date(date);
    return `${hebrewMonths[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Gets the fixed payment amount from configuration.
 * @returns {number} - The fixed payment amount.
 */
function getFixedAmount() {
    return FIXED_AMOUNT;
}

module.exports = {
    validatePayment,
    calculateCoveredMonths,
    getHebrewMonthLabel,
    getFixedAmount,
    FIXED_AMOUNT
};

// Test if run directly
if (require.main === module) {
    console.log('Payment Validator Tests\n' + '='.repeat(40));
    console.log(`Fixed Amount: ${FIXED_AMOUNT} ₪\n`);

    const testCases = [400, 300, 800, 1200, 0, 450];

    testCases.forEach(amount => {
        const result = validatePayment(amount);
        console.log(`Amount: ${amount} ₪`);
        console.log(`  - Exact payment: ${result.isExact}`);
        console.log(`  - Underpayment: ${result.isUnderpayment}${result.isUnderpayment ? ` (short by ${result.shortfall} ₪)` : ''}`);
        console.log(`  - Overpayment: ${result.isOverpayment}`);
        console.log(`  - Months covered: ${result.monthsCovered}`);
        console.log(`  - Remainder: ${result.remainder} ₪\n`);
    });

    // Test month label
    console.log('Month Label Tests\n' + '='.repeat(40));
    console.log(`2026-01-04 => ${getHebrewMonthLabel('2026-01-04')}`);
    console.log(`2026-02-15 => ${getHebrewMonthLabel('2026-02-15')}`);
}
